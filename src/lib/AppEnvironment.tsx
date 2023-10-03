import { WamDescriptor } from "@webaudiomodules/api";
import { FirebaseApp } from "firebase/app";
import { Auth, User, getAuth } from "firebase/auth";
import { WAM_PLUGINS } from "../constants";
import { initFirebaseApp } from "../firebase/firebaseConfig";
import { WAMImport, fetchWam } from "../wam/wam";
import { ProjectPersistance } from "./ProjectPersistance";
import { initAudioContext } from "./initAudioContext";
import { AudioProject } from "./project/AudioProject";
import { LinkedMap } from "./state/LinkedMap";
import { SPrimitive } from "./state/LinkedState";
import { ignorePromise } from "./state/Subbable";

export type WAMAvailablePlugin = {
  // midi out, audio out, midi to audio, audio to audio
  kind: "-m" | "-a" | "m-a" | "a-a";
  import: WAMImport;
  descriptor: WamDescriptor;
};

type ProjectState = { status: "loading" } | { status: "loaded"; project: AudioProject };

export class AppEnvironment {
  // Firebase
  readonly firebaseApp: FirebaseApp;
  readonly firebaseAuth: Auth;
  readonly firebaseUser = SPrimitive.of<User | null>(null);
  // Plugins
  readonly wamHostGroup = SPrimitive.of<[id: string, key: string] | null>(null);
  readonly wamPlugins = LinkedMap.create<string, WAMAvailablePlugin>(new Map());
  readonly wamStatus = SPrimitive.of<"loading" | "ready">("loading");
  readonly faustEffects = ["PANNER", "REVERB"] as const;
  // Project
  readonly projectStatus: SPrimitive<ProjectState>;

  constructor() {
    this.firebaseApp = initFirebaseApp();
    this.firebaseAuth = getAuth(this.firebaseApp);
    this.projectStatus = SPrimitive.of<ProjectState>(
      ProjectPersistance.hasSavedData()
        ? { status: "loading" }
        : { status: "loaded", project: ProjectPersistance.defaultProject() },
    );
  }

  async initAsync(liveAudioContext: AudioContext) {
    const [audioContextInfo] = await Promise.all([initAudioContext(liveAudioContext)]);

    // Init wam host
    this.wamHostGroup.set(audioContextInfo.wamHostGroup);
    await Promise.all(
      WAM_PLUGINS.map(async ({ url, kind }) => {
        const plugin = await fetchWam(url, kind);
        if (plugin == null) {
          return;
        }
        this.wamPlugins.set(url, plugin);
      }),
    );
    this.wamStatus.set("ready");
    // once plugins have been loaded, so they're available to the project
    await this.initialLoadProject();
  }

  private async initialLoadProject() {
    if (this.projectStatus.get().status === "loading") {
      const maybeProject = await ProjectPersistance.openSaved();
      if (maybeProject == null) {
        alert("Could not open project. Clearing");
        ProjectPersistance.clearSaved();
        this.projectStatus.set({ status: "loaded", project: ProjectPersistance.defaultProject() });
      } else {
        this.projectStatus.set({ status: "loaded", project: maybeProject });
      }
    }
  }

  // project(): AudioProject {
  //   const projectStatus = this.projectStatus.get();
  //   if (projectStatus.status === "loading") {
  //     throw new Error("loading project");
  //   }
  //   return projectStatus.project;
  // }
}

export const appEnvironment = new AppEnvironment();
(window as any).appEnvironment = appEnvironment;
