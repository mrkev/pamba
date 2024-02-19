import { appEnvironment } from "../lib/AppEnvironment";
import { isRecord } from "../lib/nw/nwschema";
import { AudioProject } from "../lib/project/AudioProject";
import { pAll, pTry, runAll } from "../utils/ignorePromise";
import { AudioPackageList } from "./AudioPackageList";
import { FSDir, ProjectFileIssue } from "./localFilesystem";
import { SAudioProject, construct } from "./serializable";

type ProjectMetadata = { projectName: string };

/**
 * Package structure
 * - <project_id>
 *   * metadata          // rn only has the name, so we don't need to open the whole project
 *   * AudioProject
 *   - audio
 *     - <audio_dir_1>
 *       - audio.(mp3/wav/etc)
 *       - metadata.json
 *     - <audio_dir_2>
 *     - ...
 */
export class ProjectPackage {
  static readonly DOCUMENT_FILE_NAME = "AudioProject" as const;
  static readonly METADATA_FILE_NAME = "metadata" as const;
  // https://bugs.chromium.org/p/chromium/issues/detail?id=1522410
  static readonly AUDIO_DIR_NAME = "audiolib" as const;

  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly location: FileSystemDirectoryHandle,
    public readonly audioLibRef: AudioPackageList,
    public readonly path: readonly string[],
  ) {}

  async readProject(): Promise<ProjectFileIssue | AudioProject> {
    // dont need metadata atm but open for good measure?
    const [projectHandle, metadataHandle] = await pAll(
      pTry(this.location.getFileHandle(ProjectPackage.DOCUMENT_FILE_NAME), "invalid" as const),
      pTry(this.location.getFileHandle(ProjectPackage.METADATA_FILE_NAME), "invalid" as const),
    );
    if (projectHandle === "invalid" || metadataHandle === "invalid") {
      return { status: "invalid" } as const;
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

  async getProjectSize() {
    const [projectHandle, metadataHandle] = await pAll(
      pTry(this.location.getFileHandle(ProjectPackage.DOCUMENT_FILE_NAME), "invalid" as const),
      pTry(this.location.getFileHandle(ProjectPackage.METADATA_FILE_NAME), "invalid" as const),
    );
    if (projectHandle === "invalid" || metadataHandle === "invalid") {
      return { status: "invalid" } as const;
    }

    let size = (await projectHandle.getFile()).size;
    size += (await metadataHandle.getFile()).size;

    return size;
  }

  async projectAudioFiles() {
    return [...(await this.audioLibRef.getAllAudioLibFiles()).values()];
  }

  static async existingPackage(projRoot: FSDir): Promise<ProjectPackage | { status: "invalid" }> {
    const location = projRoot.handle;
    const metadata = await this.getProjectMetadata(location);
    const audioLibDir = await projRoot.ensure("dir", ProjectPackage.AUDIO_DIR_NAME);

    const id = location.name;
    if (metadata === "invalid" || audioLibDir === "invalid") {
      return { status: "invalid" } as const;
    }

    const projectAudioLib = new AudioPackageList(audioLibDir, "project://");
    const name = (metadata.projectName ?? "untitled") as string;

    return new ProjectPackage(id, name, location, projectAudioLib, projRoot.path);
  }

  static async getProjectMetadata(project: FileSystemDirectoryHandle) {
    // dont need metadata atm but open for good measure?
    const metadataHandle = await pTry(project.getFileHandle(ProjectPackage.METADATA_FILE_NAME), "invalid" as const);
    if (metadataHandle === "invalid") {
      return "invalid";
    }
    const file = await metadataHandle.getFile();
    const metadata = JSON.parse(await file.text());
    if (!isRecord(metadata)) {
      throw new Error("metadata is not a record!");
    }
    return metadata as ProjectMetadata; // TODO
  }

  static async saveProject(projectId: string, projectName: string, data: SAudioProject) {
    const [projects] = await pAll(appEnvironment.localFiles.projectsDir());
    const projectDir = await projects.ensure("dir", projectId);
    if (projectDir === "invalid") {
      throw new Error("save: dir could not be ensured. invalid.");
    }

    const [projectHandle, metadataHandle, audioLibDir] = await pAll(
      projectDir.handle.getFileHandle(ProjectPackage.DOCUMENT_FILE_NAME, { create: true }),
      projectDir.handle.getFileHandle(ProjectPackage.METADATA_FILE_NAME, { create: true }),
      projectDir.ensure("dir", ProjectPackage.AUDIO_DIR_NAME),
    );

    if (audioLibDir === "invalid") {
      throw new Error("save: project audiolibdir could not be ensured. invalid.");
    }

    await runAll(
      async () => {
        const writable = await projectHandle.createWritable();
        await writable.write(JSON.stringify(data));
        await writable.close();
      },
      async () => {
        const writable = await metadataHandle.createWritable();
        await writable.write(JSON.stringify({ projectName }));
        await writable.close();
      },
    );

    return new ProjectPackage(
      projectId,
      projectName,
      projectDir.handle,
      new AudioPackageList(audioLibDir, "project://"),
      projects.path.concat(projectId),
    );
  }
}
