import { AudioPackage } from "./AudioPackage";
import { FSDir, FSFile } from "./FSDir";

/**
 * A location in the filesystem for storing audio files
 * either global or in the project dir
 */

export class AudioPackageList {
  constructor(public readonly dir: FSDir) {}

  public async open(name: string) {
    const audioPackageDir = await this.dir.open("dir", name);
    if (audioPackageDir === "not_found") {
      return "not_found";
    }
    return AudioPackage.existingPackage(audioPackageDir);
  }

  public async saveAudio(file: File) {
    // TODO: check existence to prevent override?
    return AudioPackage.newUpload(file, this.dir);
  }

  public async getAllAudioLibFiles(): Promise<Map<string, AudioPackage>> {
    const libPkgs = await this.dir.list();
    const result = new Map<string, AudioPackage>();
    for await (const pkg of libPkgs) {
      if (pkg instanceof FSFile) {
        continue;
      }

      const audioPackage = await AudioPackage.existingPackage(pkg);
      result.set(pkg.handle.name, audioPackage);
    }

    return result;
  }
}
