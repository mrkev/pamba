import { ProjectPackage } from "../data/ProjectPackage";
import { LocalFilesystem } from "../data/localFilesystem";
import { appEnvironment } from "./AppEnvironment";
import { AudioClip } from "./AudioClip";
import { standardTrack } from "./StandardTrack";
import { audioProject, AudioProject } from "./project/AudioProject";

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

  async deleteProject(projectPackage: ProjectPackage) {
    const result = await appEnvironment.localFiles.projectLib.delete(projectPackage.id);
    if (result === "error") {
      alert(`Could not delete project "${projectPackage.name}".`);
      return;
    }

    // If the deleted project happened to be the open one, drop the stale references
    // so we don't try to reopen a project that no longer exists.
    if (appEnvironment.projectPacakge.get()?.id === projectPackage.id) {
      appEnvironment.projectPacakge.set(null);
    }
    if (window.localStorage.getItem("pamba.project.open_id") === projectPackage.id) {
      window.localStorage.removeItem("pamba.project.open_id");
    }
  },

  async renameProject(projectPackage: ProjectPackage, name: string) {
    const renamed = await projectPackage.rename(name);
    if (renamed === "error") {
      alert(`Could not rename project "${projectPackage.name}".`);
      return;
    }

    // Update the library's in-memory state so the list re-renders with the new name.
    appEnvironment.localFiles.projectLib.state.set(renamed.id, renamed);

    // Keep the open-project reference in sync if it's the one we renamed.
    if (appEnvironment.projectPacakge.get()?.id === renamed.id) {
      appEnvironment.projectPacakge.set(renamed);
    }
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
    const bass = await audioProject.addAudioTrack(project);
    standardTrack.addClip(project, bass, await AudioClip.fromURL("bassguitar.mp3"));
    const drums = await audioProject.addAudioTrack(project);
    standardTrack.addClip(project, drums, await AudioClip.fromURL("drums.mp3"));
    const clav = await audioProject.addAudioTrack(project);
    standardTrack.addClip(project, clav, await AudioClip.fromURL("clav.mp3"));
    project.projectName.set("sample project");
    return project;
  },
};
