import { AudioProject } from "../lib/project/AudioProject";
import { AudioPackage } from "./AudioPackage";
import { FSDir, FSFile } from "../fs/FSDir";
import { PackageLibrary } from "./PackageLibrary";
import { ProjectPackage } from "./ProjectPackage";
import { serializable } from "./serializable";

/**
 * root
 * - projects
 *    - <project_id>
 *      * metadata          // rn only has the name, so we don't need to open the whole project
 *      * AudioProject
 *      - audio
 *        - <audio_dir_1>
 *          - audio.(mp3/wav/etc)
 *          - metadata.json
 *        - <audio_dir_2>
 *        - ...
 * - audiolib
 *  - <audio_dir_1>
 *  - <audio_dir_2>
 *
 */
export class LocalFilesystem {
  static readonly ROOT_NAME = "";
  static readonly PROJECTS_DIR = "projects";
  static readonly GLOBAL_AUDIO_LIB_DIR = "audiolib";

  // audio
  readonly audioLib = new PackageLibrary<AudioPackage>(
    [LocalFilesystem.ROOT_NAME, LocalFilesystem.GLOBAL_AUDIO_LIB_DIR],
    async (dir) => await AudioPackage.existingPackage(dir),
  );

  // projects
  readonly projectLib = new PackageLibrary<ProjectPackage>(
    [LocalFilesystem.ROOT_NAME, LocalFilesystem.PROJECTS_DIR],
    async (dir) => await ProjectPackage.existingPackage(dir),
  );

  /** Walks down the filesystem looking for or creating directories */
  static async walk(path: readonly string[], opts: { create: boolean }) {
    switch (path[0]) {
      case undefined:
        throw new Error("fs: empty path");
      case LocalFilesystem.ROOT_NAME:
        break;
      default:
        throw new Error(`fs: path doesn't start at root: ${path}`);
    }

    let currentDir = navigator.storage.getDirectory();
    for (let i = 1; i < path.length; i++) {
      currentDir = currentDir.then((x) => x.getDirectoryHandle(path[i], opts));
    }

    const dir = await currentDir;
    return new FSDir(dir, path);
  }

  /** looks for a file or directory */
  static async browse(path: readonly string[]): Promise<FSFile | FSDir | "err"> {
    switch (path[0]) {
      case undefined:
        throw new Error("fs: empty path");
      case LocalFilesystem.ROOT_NAME:
        break;
      default:
        throw new Error(`fs: path doesn't start at root: ${path}`);
    }

    let currentDir: FSDir | FSFile | "err" = await navigator.storage.getDirectory().then((dir) => {
      return new FSDir(dir, []);
    });
    for (let i = 1; i < path.length; i++) {
      if (currentDir instanceof FSFile) {
        // we have to keep going but found a file
        return "err";
      } else if (currentDir instanceof FSDir) {
        // keep going
        currentDir = await currentDir.openAny(path[i]);
      } else {
        // an error ocurred
        return "err";
      }
    }

    return currentDir;
  }

  async saveProject(project: AudioProject) {
    const data = await serializable(project);
    const projectPackage = await ProjectPackage.saveProject(project.projectId, project.projectName.get(), data);
    this.projectLib.state.set(project.projectId, projectPackage);
  }
}
