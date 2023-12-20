import * as musicMetadata from "music-metadata-browser";
import { pAll, pTry, runAll } from "../../utils/ignorePromise";
import { appEnvironment } from "../AppEnvironment";
import { isRecord } from "../nw/nwschema";

function localURLOfFileName(fileName: string) {
  return `library://${fileName}`;
}

export function fileNameOfLocalURL(url: string) {
  const result = url.match(/library:\/\/(.+)/);
  return result == null ? null : result[1];
}

export class AudioPackage {
  readonly kind = "local" as const;
  static readonly BUFFER_FILE_NAME = "audio" as const;
  static readonly METADATA_FILE_NAME = "metadata" as const;

  private constructor(
    public readonly name: string,
    public readonly file: File,
    public readonly metadata: musicMetadata.IAudioMetadata,
    public readonly localURL: string,
  ) {}

  static async existingPackage(location: FileSystemDirectoryHandle) {
    // dont need metadata atm but open for good measure?
    const [fileHandle, metadataHandle] = await pAll(
      location.getFileHandle(AudioPackage.BUFFER_FILE_NAME),
      location.getFileHandle(AudioPackage.METADATA_FILE_NAME),
    );

    const [file, metadataFile] = await pAll(fileHandle.getFile(), metadataHandle.getFile());
    const metadata = JSON.parse(await metadataFile.text());
    if (!isRecord(metadata)) {
      throw new Error("metadata is not a record!");
    }

    const name = location.name;

    return new AudioPackage(name, file, metadata as any, localURLOfFileName(name));
  }

  static async newUpload(file: File, location: FileSystemDirectoryHandle) {
    // Verify type
    switch (file.type) {
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
      location,
      file.name,
    );
    if (existing instanceof FileSystemDirectoryHandle) {
      return "error_file_exists";
    }

    const newPackage = await pTry(location.getDirectoryHandle(file.name, { create: true }), "error_creating" as const);
    if (newPackage === "error_creating") {
      return "error_creating";
    }

    const [audioBuffer, metadataHandle] = await pAll(
      newPackage.getFileHandle("audio", { create: true }),
      newPackage.getFileHandle("metadata", { create: true }),
    );

    await runAll(
      async () => {
        const writable = await audioBuffer.createWritable();
        await writable.write(file);
        await writable.close();
      },
      async () => {
        const writable = await metadataHandle.createWritable();
        await writable.write(JSON.stringify({ musicMetadata: metadata }));
        await writable.close();
      },
    );

    return new AudioPackage(file.name, file, metadata, localURLOfFileName(file.name));
  }
}
