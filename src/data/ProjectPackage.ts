import { appEnvironment } from "../lib/AppEnvironment";
import { isRecord } from "../lib/nw/nwschema";
import { AudioProject } from "../lib/project/AudioProject";
import { pAll, pTry, runAll } from "../utils/ignorePromise";
import { AudioPackageLibraryRef, ProjectFileIssue } from "./localFilesystem";
import { SAudioProject, construct, serializable } from "./serializable";

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
    public readonly audioLibRef: AudioPackageLibraryRef,
  ) {}

  async openProject(): Promise<ProjectFileIssue | AudioProject> {
    // dont need metadata atm but open for good measure?
    const [projectHandle, metadataHandle] = await pAll(
      pTry(this.location.getFileHandle(ProjectPackage.DOCUMENT_FILE_NAME), "invalid" as const),
      pTry(this.location.getFileHandle(ProjectPackage.METADATA_FILE_NAME), "invalid" as const),
    );
    if (projectHandle === "invalid" || metadataHandle === "invalid") {
      return { status: "invalid" } as const;
    }

    appEnvironment.openProjectPackage = this;
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
      appEnvironment.openProjectPackage = null;
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

  static async existingPackage(location: FileSystemDirectoryHandle): Promise<ProjectPackage | { status: "invalid" }> {
    const metadata = await this.getProjectMetadata(location);
    const audioLibHandle = await pTry(
      location.getDirectoryHandle(ProjectPackage.AUDIO_DIR_NAME, { create: true }),
      "invalid" as const,
    );

    const id = location.name;
    if (metadata === "invalid" || audioLibHandle === "invalid") {
      return { status: "invalid" } as const;
    }

    const projectAudioLib = new AudioPackageLibraryRef(audioLibHandle, "project://");

    return new ProjectPackage(id, (metadata.projectName ?? "untitled") as string, location, projectAudioLib);
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
    const projectDir = await projects.getDirectoryHandle(`${projectId}`, { create: true });

    const [projectHandle, metadataHandle, audioLibHandle] = await pAll(
      projectDir.getFileHandle(ProjectPackage.DOCUMENT_FILE_NAME, { create: true }),
      projectDir.getFileHandle(ProjectPackage.METADATA_FILE_NAME, { create: true }),
      projectDir.getDirectoryHandle(ProjectPackage.AUDIO_DIR_NAME, { create: true }),
    );

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
      projectDir,
      new AudioPackageLibraryRef(audioLibHandle, "project://"),
    );
  }
}
