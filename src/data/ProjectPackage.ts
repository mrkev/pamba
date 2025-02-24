import { FSDir } from "../fs/FSDir";
import { appEnvironment } from "../lib/AppEnvironment";
import { isRecord } from "../lib/nw/nwschema";
import { AudioProject } from "../lib/project/AudioProject";
import { pAll, pTry } from "../utils/ignorePromise";
import { AudioPackage } from "./AudioPackage";
import { AudioPackageList } from "./AudioPackageList";
import { PackageLibrary } from "./PackageLibrary";
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

  private _localAudioLib: PackageLibrary<AudioPackage> | null = null;

  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly audioLibRef: AudioPackageList,
    private readonly pkgDir: FSDir,
  ) {}

  async readProject(): Promise<{ status: "invalid" } | AudioProject> {
    // dont need metadata atm but open for good measure?
    const [projectFS, metadataFS] = await pAll(
      pTry(this.pkgDir.openThrow("file", ProjectPackage.DOCUMENT_FILE_NAME), "invalid" as const),
      pTry(this.pkgDir.openThrow("file", ProjectPackage.METADATA_FILE_NAME), "invalid" as const),
    );

    if (projectFS === "invalid" || metadataFS === "invalid") {
      return { status: "invalid" } as const;
    }

    const file = await projectFS.getFile();

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
      pTry(this.pkgDir.openThrow("file", ProjectPackage.DOCUMENT_FILE_NAME), "invalid" as const),
      pTry(this.pkgDir.openThrow("file", ProjectPackage.METADATA_FILE_NAME), "invalid" as const),
    );
    if (projectHandle === "invalid" || metadataHandle === "invalid") {
      return { status: "invalid" } as const;
    }

    let size = (await projectHandle.getFile()).size;
    size += (await metadataHandle.getFile()).size;

    return size;
  }

  async localAudioLib(): Promise<PackageLibrary<AudioPackage>> {
    if (this._localAudioLib != null) {
      return this._localAudioLib;
    }

    const audioLibDir = await this.pkgDir.ensure("dir", ProjectPackage.AUDIO_DIR_NAME);
    if (typeof audioLibDir === "string") {
      throw new Error("Error: can't find or create local audio lib");
    }
    const lib = new PackageLibrary(audioLibDir.path, async (dir) => await AudioPackage.existingPackage(dir));
    await lib._initState();
    this._localAudioLib = lib;
    return lib;
  }

  // TODO: remove, no functionality to consolidate audio inside project yet
  async projectAudioFiles() {
    return [...(await this.audioLibRef.getAllAudioLibFiles()).values()];
  }

  static async existingPackage(projRoot: FSDir): Promise<ProjectPackage | "invalid"> {
    const metadata = await this.getProjectMetadata(projRoot);
    const audioLibDir = await projRoot.ensure("dir", ProjectPackage.AUDIO_DIR_NAME);

    const id = projRoot.name;
    if (metadata === "invalid" || audioLibDir === "invalid") {
      return "invalid";
    }

    const projectAudioLib = new AudioPackageList(audioLibDir);
    const name = (metadata.projectName ?? "untitled") as string;

    return new ProjectPackage(id, name, projectAudioLib, projRoot);
  }

  static async getProjectMetadata(projRoot: FSDir) {
    // dont need metadata atm but open for good measure?
    const metadataHandle = await pTry(
      projRoot.openThrow("file", ProjectPackage.METADATA_FILE_NAME),
      "invalid" as const,
    );
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

  // TODO: replace with save project to package, and provide a project package?
  static async saveProject(projectId: string, projectName: string, data: SAudioProject) {
    const [projects] = await pAll(appEnvironment.localFiles.projectLib.dir());
    const projectDir = await projects.ensure("dir", projectId);
    if (projectDir === "invalid") {
      throw new Error("save: dir could not be ensured. invalid.");
    }

    const [projectHandle, metadataHandle, audioLibDir] = await pAll(
      projectDir.ensureThrow("file", ProjectPackage.DOCUMENT_FILE_NAME),
      projectDir.ensureThrow("file", ProjectPackage.METADATA_FILE_NAME),
      projectDir.ensure("dir", ProjectPackage.AUDIO_DIR_NAME),
    );

    if (audioLibDir === "invalid") {
      throw new Error("save: project audiolibdir could not be ensured. invalid.");
    }

    await pAll(
      //
      projectHandle.write(JSON.stringify(data)),
      metadataHandle.write(JSON.stringify({ projectName })),
    );

    return new ProjectPackage(projectId, projectName, new AudioPackageList(audioLibDir), projectDir);
  }
}
