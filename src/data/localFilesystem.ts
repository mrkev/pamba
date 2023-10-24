import { AudioProject } from "../lib/project/AudioProject";
import { isRecord } from "../lib/schema/schema";
import { LinkedArray } from "../lib/state/LinkedArray";
import { LinkedMap } from "../lib/state/LinkedMap";
import { bucketizeId } from "../utils/data";
import { pAll, pTry, runAll } from "../utils/ignorePromise";
import { construct, serializable } from "./serializable";

type ProjectFileIssue = { status: "not_found" } | { status: "invalid" };

/**
 * root
 * - projects
 *    - <project_id>
 *      * metadata          // rn only has the name, so we don't need to open the whole project
 *      * AudioProject
 *      - audio
 *        * <audio_file_1>
 *        * <audio_file_2>
 *        * ...
 * - AudioLib
 *  * <audio_file_1>
 *  * <audio_file_2>
 */
export class LocalFilesystem {
  // id -> name, id
  readonly _projects = LinkedMap.create<string, { name: string; id: string }>();

  async updateProjects() {
    const updated = await this.getAllProjects();
    this._projects._setRaw(bucketizeId(updated));
  }

  private async projectsDir() {
    const opfsRoot = await navigator.storage.getDirectory();
    const projects = await opfsRoot.getDirectoryHandle("projects", { create: true });
    return projects;
  }

  private async audioDir() {
    const opfsRoot = await navigator.storage.getDirectory();
    const audioDir = await opfsRoot.getDirectoryHandle("audiolib", { create: true });
    return audioDir;
  }

  async openProject(projectId: string): Promise<ProjectFileIssue | AudioProject> {
    const projects = await this.projectsDir();
    const project = await pTry(projects.getDirectoryHandle(`${projectId}`), "not_found" as const);
    if (project === "not_found") {
      return { status: "not_found" };
    }

    // dont need metadata atm but open for good measure?
    const [projectHandle, metadataHandle] = await pAll(
      pTry(project.getFileHandle("AudioProject"), "invalid" as const),
      pTry(project.getFileHandle("metadata"), "invalid" as const),
    );
    if (projectHandle === "invalid" || metadataHandle === "invalid") {
      return { status: "invalid" };
    }

    const file = await projectHandle.getFile();

    try {
      const parsed = JSON.parse(await file.text());
      if (!isRecord(parsed)) {
        return { status: "invalid" };
      }
      const constructed = await construct(parsed as any);
      if (!(constructed instanceof AudioProject)) {
        return { status: "invalid" };
      }
      return constructed;
    } catch (e) {
      console.error(e);
      return { status: "invalid" };
    }
  }

  async saveProject(project: AudioProject) {
    const [projects, data] = await pAll(this.projectsDir(), serializable(project));
    const projectDir = await projects.getDirectoryHandle(`${project.projectId}`, { create: true });

    const [projectHandle, metadataHandle] = await pAll(
      projectDir.getFileHandle("AudioProject", { create: true }),
      projectDir.getFileHandle("metadata", { create: true }),
    );

    await runAll(
      async () => {
        const writable = await projectHandle.createWritable();
        await writable.write(JSON.stringify(data));
        await writable.close();
      },
      async () => {
        const writable = await metadataHandle.createWritable();
        await writable.write(JSON.stringify({ projectName: project.projectName.get() }));
        await writable.close();
      },
    );

    const existing = this._projects.get(project.projectId);

    if (existing && existing.name === project.projectName.get()) {
      return;
    }

    this._projects.set(project.projectId, {
      id: project.projectId,
      name: project.projectName.get(),
    });
  }

  private async getProjectMetadata(project: FileSystemDirectoryHandle) {
    // dont need metadata atm but open for good measure?
    const metadataHandle = await project.getFileHandle("metadata");
    const file = await metadataHandle.getFile();
    const metadata = JSON.parse(await file.text());
    if (!isRecord(metadata)) {
      throw new Error("metadata is not a record!");
    }
    return metadata;
  }

  private async getAllProjects(): Promise<{ name: string; id: string }[]> {
    const opfsRoot = await navigator.storage.getDirectory();
    const projects = await opfsRoot.getDirectoryHandle("projects", { create: true });
    console.log(projects);
    // https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/1639\

    const result = [];
    for await (let [id, handle] of (projects as any).entries()) {
      handle as FileSystemDirectoryHandle | FileSystemFileHandle;
      if (handle instanceof FileSystemFileHandle) {
        continue;
      }

      const metadata = await this.getProjectMetadata(handle);
      result.push({ name: (metadata.projectName ?? "untitled") as string, id });
    }

    return result;
  }
}
