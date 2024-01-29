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

  static async openLastProject(localFiles: LocalFilesystem): Promise<AudioProject | null> {
    const projects = await localFiles.getAllProjects();
    if (projects.length === 0) {
      return this.sampleProject();
    }

    let id = window.localStorage.getItem("pamba.project.open_id");
    if (id === null) {
      // TODO: save modification date and open most recent?
      id = projects[0].id;
    }

    const result = await localFiles.openProject(id);
    if (result instanceof AudioProject) {
      return result;
    } else {
      return this.emptyProject();
    }
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
