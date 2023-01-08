import { construct, serializable } from "../data/serializable";
import { isRecord } from "./schema/schema";
import { AudioProject } from "./AudioProject";

export class ProjectPersistance {
  static async doSave(project: AudioProject) {
    const data = await serializable(project);
    window.localStorage.setItem("pamba.project", JSON.stringify(data));
    console.log("saved", data);
  }

  static clearSaved() {
    localStorage.removeItem("pamba.project");
  }

  static hasSavedData(): boolean {
    const data = window.localStorage.getItem("pamba.project");
    return data !== null;
  }

  static async openSaved(): Promise<AudioProject | null> {
    const data = window.localStorage.getItem("pamba.project");
    if (data == null) {
      return null;
    }
    try {
      const parsed = JSON.parse(data);
      if (!isRecord(parsed)) {
        return null;
      }
      const constructed = await construct(parsed as any);
      if (!(constructed instanceof AudioProject)) {
        return null;
      }
      return constructed;
    } catch (_e) {
      return null;
    }
  }

  static defaultProject(): AudioProject {
    const audioProject = AudioProject.create();
    AudioProject.addTrack(audioProject);
    return audioProject;
  }
}