import { ProjectPackage } from "../data/ProjectPackage";
import { LocalFilesystem } from "../data/localFilesystem";
import { appEnvironment } from "./AppEnvironment";
import { AudioClip } from "./AudioClip";
import { ProjectTrack } from "./ProjectTrack";
import { AudioProject } from "./project/AudioProject";

export class ProjectPersistance {
  static async doSave(project: AudioProject) {
    await appEnvironment.localFiles.saveProject(project);
    window.localStorage.setItem("pamba.project.open_id", project.projectId);
  }

  static clearSaved() {
    localStorage.removeItem("pamba.project");
  }

  static hasSavedData(): boolean {
    const data = window.localStorage.getItem("pamba.project");
    console.log("Saved data:", data !== null);
    return data !== null;
  }

  static async openLastProject(localFiles: LocalFilesystem) {
    const projects = await localFiles.projectLib.getAll();
    if (projects.length === 0) {
      return this.sampleProject();
    }

    let id = window.localStorage.getItem("pamba.project.open_id");
    if (id === null) {
      // TODO: save modification date and open most recent?
      id = projects[0].id;
    }

    const result = await localFiles.projectLib.getPackage(id);
    if (result instanceof ProjectPackage) {
      await this.openProject(id, false);
    } else {
      await this.openEmptyProject();
    }
  }

  public static async openEmptyProject() {
    if (appEnvironment.projectStatus.get().status === "loading") {
      console.warn("Aleady loading a project");
      return;
    }

    appEnvironment.projectStatus.set({ status: "loaded", project: ProjectPersistance.emptyProject() });
    appEnvironment.projectPacakge.set(null);
  }

  public static async openProject(projectId: string, skipIfLoading: boolean = true) {
    if (skipIfLoading && appEnvironment.projectStatus.get().status === "loading") {
      console.warn("Aleady loading a project");
      return;
    }
    console.log("NOW OPENING PROJECT");

    const projectPackage = await appEnvironment.localFiles.projectLib.getPackage(projectId);
    if (!(projectPackage instanceof ProjectPackage)) {
      alert(`issue opening project: ${projectPackage}`);
      return;
    }

    const project = await projectPackage.readProject();
    if (!(project instanceof AudioProject)) {
      alert(`issue opening project: ${project.status}`);
      return;
    }

    appEnvironment.projectStatus.set({ status: "loaded", project: project });
    appEnvironment.projectPacakge.set(projectPackage);
  }

  static emptyProject(): AudioProject {
    const audioProject = AudioProject.create();
    return audioProject;
  }

  static async sampleProject(): Promise<AudioProject> {
    const project = AudioProject.create();
    const bass = AudioProject.addAudioTrack(project);
    ProjectTrack.addClip(project, bass, await AudioClip.fromURL("bassguitar.mp3"));
    const drums = AudioProject.addAudioTrack(project);
    ProjectTrack.addClip(project, drums, await AudioClip.fromURL("drums.mp3"));
    const clav = AudioProject.addAudioTrack(project);
    ProjectTrack.addClip(project, clav, await AudioClip.fromURL("clav.mp3"));
    project.projectName.set("sample project");
    return project;
  }
}
