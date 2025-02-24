import * as musicMetadata from "music-metadata-browser";
import { FSDir } from "../fs/FSDir";
import { isRecord } from "../lib/nw/nwschema";
import { pAll, pTry } from "../utils/ignorePromise";

/**
 * Represents an audio file in the virtual filesystem
 */
export class AudioPackage {
  readonly kind = "AudioPackage.local" as const;
  static readonly BUFFER_FILE_NAME = "audio" as const;
  static readonly METADATA_FILE_NAME = "metadata" as const;

  private constructor(
    public readonly name: string,
    public readonly file: File,
    public readonly metadata: musicMetadata.IAudioMetadata,
    public readonly pkgRoot: FSDir,
  ) {}

  public url() {
    return new URL(`opfs:${this.pkgRoot.path.join("/")}`);
  }

  /** "opens" an audio pacakge at a given directory */
  static async existingPackage(pkgDir: FSDir) {
    // dont need metadata atm but open for good measure?
    const [fileHandle, metadataHandle] = await pAll(
      pTry(pkgDir.openThrow("file", AudioPackage.BUFFER_FILE_NAME), "error" as const),
      pTry(pkgDir.openThrow("file", AudioPackage.METADATA_FILE_NAME), "error" as const),
    );

    if (fileHandle === "error" || metadataHandle === "error") {
      throw new Error("ERROR: " + pkgDir.path);
    }

    const [file, metadataFile] = await pAll(fileHandle.read(), metadataHandle.read());
    const metadata = JSON.parse(await metadataFile.text());
    if (!isRecord(metadata)) {
      throw new Error("metadata is not a record!");
    }

    return new AudioPackage(pkgDir.name, file, metadata as any, pkgDir);
  }

  static async newUpload(file: File, dir: FSDir) {
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
    const existing = await dir.open("dir", file.name);
    if (existing instanceof FSDir) {
      return "error_dir_exists";
    }

    const newPackage = await dir.ensure("dir", file.name);

    if (newPackage === "invalid") {
      return "error_creating";
    }

    const [audioBufferFile, metadataFile] = await pAll(
      // todo: ensure? what if they already exist?
      newPackage.ensureThrow("file", "audio"),
      newPackage.ensureThrow("file", "metadata"),
    );

    console.log("attempting to save");

    await pAll(
      //
      audioBufferFile.write(file),
      metadataFile.write(JSON.stringify({ musicMetadata: metadata })),
    );

    return new AudioPackage(file.name, file, metadata, newPackage);
  }
}
