import { FSDir, FSFile } from "../fs/FSDir";
import { AudioProject } from "../lib/project/AudioProject";
import { AudioPackage } from "./AudioPackage";
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
 *        - <audio_package_1>
 *          - audio.(mp3/wav/etc)
 *          - metadata.json
 *        - <audio_package_2>
 *        - ...
 * - audiolib
 *  - <audio_package_1>
 *  - <audio_package_2>
 *
 */
export class LocalFilesystem {
  static readonly ROOT_NAME = "";
  static readonly PROJECTS_DIR = "projects";
  static readonly GLOBAL_AUDIO_LIB_DIR = "audiolib";

  private constructor(
    public readonly audioLib: PackageLibrary<AudioPackage>,
    public readonly projectLib: PackageLibrary<ProjectPackage>,
  ) {}

  static async initialize() {
    // audio
    const audioLib = await PackageLibrary.init<AudioPackage>(
      await LocalFilesystem.walk([LocalFilesystem.ROOT_NAME, LocalFilesystem.GLOBAL_AUDIO_LIB_DIR], { create: true }),
      async (dir) => await AudioPackage.existingPackage(dir),
    );

    // projects
    const projectLib = await PackageLibrary.init<ProjectPackage>(
      await LocalFilesystem.walk([LocalFilesystem.ROOT_NAME, LocalFilesystem.PROJECTS_DIR], { create: true }),
      async (dir) => await ProjectPackage.existingPackage(dir),
    );

    return new LocalFilesystem(audioLib, projectLib);
  }

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

    let currentDir: FSDir | FSFile | "not_found" = await navigator.storage.getDirectory().then((dir) => {
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

    return currentDir === "not_found" ? "err" : currentDir;
  }

  async saveProject(project: AudioProject) {
    const data = await serializable(project);
    const projectPackage = await ProjectPackage.saveProject(project.projectId, project.projectName.get(), data);
    this.projectLib.state.set(project.projectId, projectPackage);
  }
}
