import { ProjectPackage } from "../data/ProjectPackage";
import { LocalFilesystem } from "../data/localFilesystem";
import { appEnvironment } from "./AppEnvironment";
import { AudioClip } from "./AudioClip";
import { standardTrack } from "./StandardTrack";
import { AudioProject } from "./project/AudioProject";

export const projectPersistance = {
  /**
   * Saves current project to OPFS and markes it as the last open project
   */
  async doSave(project: AudioProject) {
    await appEnvironment.localFiles.saveProject(project);
    appEnvironment.projectDirtyObserver.markClean();
    window.localStorage.setItem("pamba.project.open_id", project.projectId);
  },

  async getLastProject(localFiles: LocalFilesystem) {
    const projects = await localFiles.projectLib.getAll();
    if (projects.length === 0) {
      const sampleProject = await this.sampleProject();
      await projectPersistance.doSave(sampleProject);
      return sampleProject;
    }

    let id = window.localStorage.getItem("pamba.project.open_id");
    if (id === null) {
      // TODO: save modification date and open most recent?
      id = projects[0].id;
    }

    const result = await localFiles.projectLib.getPackage(id);
    if (result instanceof ProjectPackage) {
      return result;
    } else {
      return null;
    }
  },

  async deleteProject(project: ProjectPackage) {
    alert("TODO: not implemented");
  },

  async renameProject(project: ProjectPackage, name: string) {
    alert("TODO: not implemented");
  },

  async openEmptyProject() {
    if (appEnvironment.projectStatus.get().status === "loading") {
      console.warn("Aleady loading a project");
      return;
    }

    appEnvironment.loadProject(projectPersistance.emptyProject());
    appEnvironment.projectPacakge.set(null);
    console.log("OPENED EMPTY PROJECT");
  },

  async openProject(projectId: string, skipIfLoading: boolean = true): Promise<void> {
    if (skipIfLoading && appEnvironment.projectStatus.get().status === "loading") {
      console.warn("Aleady loading a project");
      return;
    }
    console.log("NOW OPENING PROJECT");

    const projectPackage = await appEnvironment.localFiles.projectLib.getPackage(projectId);
    if (!(projectPackage instanceof ProjectPackage)) {
      alert(`issue opening project: ${projectPackage}`);
      // On error create and open empty project:
      appEnvironment.loadProject(projectPersistance.emptyProject());
      appEnvironment.projectPacakge.set(null);
      return;
    }

    const project = await projectPackage.readProject();
    if (!(project instanceof AudioProject)) {
      alert(`issue opening project: ${project.status}`);
      // On error create and open empty project:
      appEnvironment.loadProject(projectPersistance.emptyProject());
      appEnvironment.projectPacakge.set(null);
      return;
    }

    appEnvironment.loadProject(project);
    appEnvironment.projectPacakge.set(projectPackage);
  },

  emptyProject(): AudioProject {
    const audioProject = AudioProject.create();
    return audioProject;
  },

  async sampleProject(): Promise<AudioProject> {
    const project = AudioProject.create();
    const bass = AudioProject.addAudioTrack(project);
    standardTrack.addClip(project, bass, await AudioClip.fromURL("bassguitar.mp3"));
    const drums = AudioProject.addAudioTrack(project);
    standardTrack.addClip(project, drums, await AudioClip.fromURL("drums.mp3"));
    const clav = AudioProject.addAudioTrack(project);
    standardTrack.addClip(project, clav, await AudioClip.fromURL("clav.mp3"));
    project.projectName.set("sample project");
    return project;
  },
};
