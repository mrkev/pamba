import { pTry } from "../utils/ignorePromise";
import { AudioPackage } from "./AudioPackage";
import { FSDir } from "./localFilesystem";

/**
 * A location in the filesystem for storing audio files
 * either global or in the project dir
 */

export class AudioPackageList {
  constructor(
    private readonly dir: FSDir,
    public readonly kind: "library://" | "project://",
  ) {}

  public async getAudioPackage(name: string) {
    const audioPackageHandle = await pTry(this.dir.handle.getDirectoryHandle(name), "invalid" as const);
    if (audioPackageHandle === "invalid") {
      return "invalid";
    }
    return AudioPackage.existingPackage(audioPackageHandle, this.kind);
  }

  public async saveAudio(file: File) {
    // TODO: check existence to prevent override?
    return AudioPackage.newUpload(file, this.dir.handle, this.kind);
  }

  public async getAllAudioLibFiles(): Promise<Map<string, AudioPackage>> {
    const result = new Map<string, AudioPackage>();
    for await (let [id, handle] of (this.dir.handle as any).entries()) {
      handle as FileSystemDirectoryHandle | FileSystemFileHandle;
      if (handle instanceof FileSystemFileHandle) {
        continue;
      }

      const audioPackage = await AudioPackage.existingPackage(handle, this.kind);
      result.set(id, audioPackage);
    }

    return result;
  }
}
