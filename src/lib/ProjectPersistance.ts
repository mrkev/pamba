import { ProjectPackage } from "../data/ProjectPackage";
import { LocalFilesystem } from "../data/localFilesystem";
import { appEnvironment } from "./AppEnvironment";
import { AudioClip } from "./AudioClip";
import { ProjectTrack } from "./ProjectTrack";
import { AudioProject } from "./project/AudioProject";

export abstract class ProjectPersistance {
  static async doSave(project: AudioProject) {
    await appEnvironment.localFiles.saveProject(project);
    appEnvironment.projectDirtyObserver.markClean();
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
      const sampleProject = await this.sampleProject();
      appEnvironment.loadProject(sampleProject);
      return;
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

    appEnvironment.loadProject(ProjectPersistance.emptyProject());
    appEnvironment.projectPacakge.set(null);
    console.log("OPENED EMPTY PROJECT");
  }

  public static async openProject(projectId: string, skipIfLoading: boolean = true): Promise<void> {
    if (skipIfLoading && appEnvironment.projectStatus.get().status === "loading") {
      console.warn("Aleady loading a project");
      return;
    }
    console.log("NOW OPENING PROJECT");

    const projectPackage = await appEnvironment.localFiles.projectLib.getPackage(projectId);
    if (!(projectPackage instanceof ProjectPackage)) {
      alert(`issue opening project: ${projectPackage}`);
      // On error create and open empty project:
      appEnvironment.loadProject(ProjectPersistance.emptyProject());
      appEnvironment.projectPacakge.set(null);
      return;
    }

    const project = await projectPackage.readProject();
    if (!(project instanceof AudioProject)) {
      alert(`issue opening project: ${project.status}`);
      // On error create and open empty project:
      appEnvironment.loadProject(ProjectPersistance.emptyProject());
      appEnvironment.projectPacakge.set(null);
      return;
    }

    appEnvironment.loadProject(project);
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
