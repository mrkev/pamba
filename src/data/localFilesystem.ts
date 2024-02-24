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

  async saveProject(project: AudioProject) {
    const data = await serializable(project);
    const projectPackage = await ProjectPackage.saveProject(project.projectId, project.projectName.get(), data);
    this.projectLib.state.set(project.projectId, projectPackage);
  }
}
