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

  private readonly ROOT_NAME = "";

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
    return new FSDir(projects, [this.ROOT_NAME, "projects"]);
  }

  async audioLibDir() {
    const opfsRoot = await navigator.storage.getDirectory();
    const audioDir = await opfsRoot.getDirectoryHandle("audiolib", { create: true });
    return audioDir;
  }

  async openProject(projectId: string): Promise<ProjectFileIssue | AudioProject> {
    const projects = await this.projectsDir();
    const project = await projects.open("dir", projectId);
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
    const project = await projects.open("dir", projectId);
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
    const result = await projects.delete(projectId);
    if (result === "error") {
      return result;
    }
    await this.updateProjects();
    return null;
  }

  public async getAllProjects(): Promise<ProjectPackage[]> {
    const projects = await (await this.projectsDir()).list();
    // https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/1639\

    const result = [];

    for await (let child of projects) {
      if (child instanceof FSFile) {
        continue;
      }

      const projectPackage = await ProjectPackage.existingPackage(child);
      if (projectPackage instanceof ProjectPackage) {
        result.push(projectPackage);
      } else {
        console.warn("Project", child.handle.name, "returned error", result);
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

export class FSDir {
  constructor(
    public readonly handle: FileSystemDirectoryHandle,
    public readonly path: readonly string[],
  ) {}

  public async list() {
    const results = [];
    // https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/1639
    for await (let [_, child] of (this.handle as any).entries()) {
      child as FileSystemDirectoryHandle | FileSystemFileHandle;

      if (child instanceof FileSystemFileHandle) {
        results.push(new FSFile(child, this.path.concat(this.handle.name)));
        continue;
      }

      if (child instanceof FileSystemDirectoryHandle) {
        results.push(new FSDir(child, this.path.concat(this.handle.name)));
        continue;
      }

      console.warn("FSDir: child is unknown type:", child);
    }
    return results;
  }

  public async delete(name: string) {
    try {
      await this.handle.removeEntry(name, { recursive: true });
    } catch (e) {
      return "error";
    }
    return null;
  }

  public async open(kind: "dir", name: string): Promise<FSDir | "not_found"> {
    const result = await pTry(this.handle.getDirectoryHandle(name), "not_found" as const);
    if (result === "not_found") {
      return result;
    }

    return new FSDir(result, this.path.concat(this.handle.name));
  }

  public async ensure(kind: "dir", name: string): Promise<FSDir | "invalid">;
  public async ensure(kind: "file", name: string): Promise<FSFile | "invalid">;
  public async ensure(kind: "dir" | "file", name: string): Promise<FSDir | FSFile | "invalid"> {
    switch (kind) {
      case "dir": {
        const res = await pTry(this.handle.getDirectoryHandle(name, { create: true }), "invalid" as const);
        if (res === "invalid") {
          return res;
        }
        return new FSDir(res, this.path.concat(this.handle.name));
      }
      case "file": {
        const res = await pTry(this.handle.getFileHandle(name, { create: true }), "invalid" as const);
        if (res === "invalid") {
          return res;
        }
        return new FSFile(res, this.path.concat(this.handle.name));
      }
    }
  }
}

export class FSFile {
  constructor(
    public readonly handle: FileSystemFileHandle,
    public readonly path: readonly string[],
  ) {}
}
