import * as musicMetadata from "music-metadata-browser";
import { appEnvironment } from "../lib/AppEnvironment";
import { isRecord } from "../lib/nw/nwschema";
import { pAll, runAll } from "../utils/ignorePromise";
import { FSDir } from "./localFilesystem";

/**
 * Represents an audio file in the virtual filesystem
 */
export class AudioPackage {
  readonly kind = "local" as const;
  static readonly BUFFER_FILE_NAME = "audio" as const;
  static readonly METADATA_FILE_NAME = "metadata" as const;

  private constructor(
    public readonly name: string,
    public readonly file: File,
    public readonly metadata: musicMetadata.IAudioMetadata,
    private readonly _url: string,
    public readonly pkgRoot: FSDir,
  ) {}

  public url() {
    // console.log(this._url, "vs", this.pkgRoot.path.join("/"));
    return new URL(`opfs://${this.pkgRoot.path.join("/")}`);
  }

  static async existingPackage(pkgDir: FSDir, kind: "library://" | "project://") {
    // dont need metadata atm but open for good measure?
    const [fileHandle, metadataHandle] = await pAll(
      pkgDir.handle.getFileHandle(AudioPackage.BUFFER_FILE_NAME),
      pkgDir.handle.getFileHandle(AudioPackage.METADATA_FILE_NAME),
    );

    const [file, metadataFile] = await pAll(fileHandle.getFile(), metadataHandle.getFile());
    const metadata = JSON.parse(await metadataFile.text());
    if (!isRecord(metadata)) {
      throw new Error("metadata is not a record!");
    }

    const name = pkgDir.handle.name;

    return new AudioPackage(name, file, metadata as any, kind + name, pkgDir);
  }

  static async newUpload(file: File, dir: FSDir, kind: "library://" | "project://") {
    // Verify type
    // note: to support the format "audio/ogg; codecs=opus"
    // see: https://developer.mozilla.org/en-US/docs/Web/Media/Formats/codecs_parameter
    switch (file.type.split(";")[0]) {
      // random list from https://www.thoughtco.com/audio-file-mime-types-3469485
      // TODO: check if all of these actually work
      case "audio/mpeg":
      case "audio/ogg":
      case "audio/basic":
      case "audio/L24":
      case "audio/mid":
      case "audio/mp4":
      case "audio/x-aiff":
      case "audio/x-mpegurl":
      case "audio/vnd.rn-realaudio":
      case "audio/vorbis":
      case "audio/vnd.wav":
      case "audio/wav":
        break;
      default: {
        // TODO: upload fails but ui has no feedback for users
        return "error_unsupported_format";
      }
    }

    // Extract metadata
    const metadata = await musicMetadata.parseBlob(file, {
      duration: true,
      skipCovers: true,
    });

    // Write locally
    const existing: FileSystemDirectoryHandle | "not_found" = await appEnvironment.localFiles.dirExists(
      dir.handle,
      file.name,
    );
    if (existing instanceof FileSystemDirectoryHandle) {
      return "error_file_exists";
    }

    const newPackage = await dir.ensure("dir", file.name);

    if (newPackage === "invalid") {
      return "error_creating";
    }

    const [audioBufferHandle, metadataHandle] = await pAll(
      newPackage.handle.getFileHandle("audio", { create: true }),
      newPackage.handle.getFileHandle("metadata", { create: true }),
    );

    console.log("attempting to save");

    await runAll(
      async () => {
        const writable = await audioBufferHandle.createWritable();
        await writable.write(file);
        await writable.close();
      },
      async () => {
        const writable = await metadataHandle.createWritable();
        await writable.write(JSON.stringify({ musicMetadata: metadata }));
        await writable.close();
      },
    );

    return new AudioPackage(file.name, file, metadata, `${kind}${file.name}`, newPackage);
  }
}
