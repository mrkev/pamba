import { AudioProject } from "../lib/project/AudioProject";
import { LinkedMap } from "../lib/state/LinkedMap";
import { bucketizeId } from "../utils/data";
import { pTry } from "../utils/ignorePromise";
import { AudioPackage } from "./AudioPackage";
import { ProjectPackage } from "./ProjectPackage";
import { serializable } from "./serializable";

export type ProjectFileIssue = { status: "not_found" } | { status: "invalid" };

// From: https://stackoverflow.com/a/39906526
export function niceBytes(n: number) {
  const units = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  let l = 0;

  while (n >= 1024 && ++l) {
    n = n / 1024;
  }

  return n.toFixed(n < 10 && l > 0 ? 1 : 0) + " " + units[l];
}

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
  // id -> name, id
  readonly _projects = LinkedMap.create<string, ProjectPackage>();
  readonly _audioLib = LinkedMap.create<string, AudioPackage>();

  dirExists(location: FileSystemDirectoryHandle, name: string) {
    return pTry(location.getDirectoryHandle(name), "not_found" as const);
  }

  async updateProjects() {
    const updated = await this.getAllProjects();
    this._projects._setRaw(bucketizeId(updated));
  }

  async updateAudioLib() {
    const updated = await this.getAllAudioLibFiles();
    this._audioLib._setRaw(updated);
  }

  async projectsDir() {
    const opfsRoot = await navigator.storage.getDirectory();
    const projects = await opfsRoot.getDirectoryHandle("projects", { create: true });
    return projects;
  }

  async audioLibDir() {
    const opfsRoot = await navigator.storage.getDirectory();
    const audioDir = await opfsRoot.getDirectoryHandle("audiolib", { create: true });
    return audioDir;
  }

  async openProject(projectId: string): Promise<ProjectFileIssue | AudioProject> {
    const projects = await this.projectsDir();
    const project = await pTry(projects.getDirectoryHandle(`${projectId}`), "not_found" as const);
    if (project === "not_found") {
      return { status: "not_found" } as const;
    }

    const projectPackage = await ProjectPackage.existingPackage(project);
    if (!(projectPackage instanceof ProjectPackage)) {
      return projectPackage;
    }

    return projectPackage.openProject();
  }

  async getProjectPackage(projectId: string) {
    const projects = await this.projectsDir();
    const project = await pTry(projects.getDirectoryHandle(`${projectId}`), "not_found" as const);
    if (project === "not_found") {
      return { status: "not_found" } as const;
    }

    return ProjectPackage.existingPackage(project);
  }

  async saveProject(project: AudioProject) {
    const data = await serializable(project);
    const projectPackage = await ProjectPackage.saveProject(project.projectId, project.projectName.get(), data);

    const existing = this._projects.get(project.projectId);
    if (existing && existing.name === project.projectName.get()) {
      return;
    }

    this._projects.set(project.projectId, projectPackage);
  }

  async deleteProject(projectId: string) {
    const projects = await this.projectsDir();
    try {
      await projects.removeEntry(projectId, { recursive: true });
    } catch (e) {
      return "error";
    }

    await this.updateProjects();
    return null;
  }

  public async getAllProjects(): Promise<ProjectPackage[]> {
    const opfsRoot = await navigator.storage.getDirectory();
    const projects = await opfsRoot.getDirectoryHandle("projects", { create: true });
    // https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/1639\

    const result = [];
    for await (let [id, handle] of (projects as any).entries()) {
      handle as FileSystemDirectoryHandle | FileSystemFileHandle;
      if (handle instanceof FileSystemFileHandle) {
        continue;
      }

      const projectPackage = await ProjectPackage.existingPackage(handle);
      if (projectPackage instanceof ProjectPackage) {
        result.push(projectPackage);
      } else {
        console.warn("Project", id, "returned error", result);
      }
    }

    return result;
  }

  public async getAllAudioLibFiles(): Promise<Map<string, AudioPackage>> {
    const packages = await this.audioLibDir();

    // https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/1639
    const result = new Map<string, AudioPackage>();
    for await (let [id, handle] of (packages as any).entries()) {
      handle as FileSystemDirectoryHandle | FileSystemFileHandle;
      if (handle instanceof FileSystemFileHandle) {
        continue;
      }

      const audioPackage = await AudioPackage.existingPackage(handle, "library://");

      result.set(id, audioPackage);
    }

    return result;
  }
}

/**
 * A location in the filesystem for storing audio files
 * either global or in the project dir
 */
export class AudioPackageLibraryRef {
  constructor(
    public readonly location: FileSystemDirectoryHandle,
    public readonly kind: "library://" | "project://",
  ) {}

  public async getAudioPackage(name: string) {
    const audioPackageHandle = await pTry(this.location.getDirectoryHandle(name), "invalid" as const);
    if (audioPackageHandle === "invalid") {
      return "invalid";
    }
    return AudioPackage.existingPackage(audioPackageHandle, this.kind);
  }

  public async saveAudio(file: File) {
    // TODO: check existence to prevent override?
    return AudioPackage.newUpload(file, this.location, this.kind);
  }

  public async getAllAudioLibFiles(): Promise<Map<string, AudioPackage>> {
    // https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/1639
    const result = new Map<string, AudioPackage>();
    for await (let [id, handle] of (this.location as any).entries()) {
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
