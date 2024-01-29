import { WamDescriptor } from "@webaudiomodules/api";
import { FirebaseApp } from "firebase/app";
import { Auth, User, getAuth } from "firebase/auth";
import { FIREBASE_ENABLED, WAM_PLUGINS } from "../constants";
import { initFirebaseApp } from "../firebase/firebaseConfig";
import { WAMImport, fetchWam } from "../wam/wam";
import { ProjectPersistance } from "./ProjectPersistance";
import { initAudioContext } from "./initAudioContext";
import { AudioProject } from "./project/AudioProject";
import { LinkedMap } from "./state/LinkedMap";
import { SPrimitive } from "./state/LinkedState";
import { LinkedSet } from "./state/LinkedSet";
import type { DSPNode } from "../dsp/DSPNode";
import type { MidiInstrument } from "../midi/MidiInstrument";
import { LocalFilesystem } from "../data/localFilesystem";
import { AudioRenderer } from "./AudioRenderer";
import { AnalizedPlayer } from "./AnalizedPlayer";
import { LocalSPrimitive } from "../ui/useLocalStorage";
import { FAUST_EFFECTS } from "../dsp/FAUST_EFFECTS";
import { ProjectPackage } from "../data/ProjectPackage";

export type WAMAvailablePlugin = {
  // midi out, audio out, midi to audio, audio to audio
  kind: "-m" | "-a" | "m-a" | "a-a";
  import: WAMImport;
  descriptor: WamDescriptor;
};

type ProjectState = { status: "loading" } | { status: "loaded"; project: AudioProject };

export class AppEnvironment {
  // Firebase
  readonly firebaseApp: FirebaseApp | null;
  readonly firebaseAuth: Auth | null;
  readonly firebaseUser = SPrimitive.of<User | null>(null);
  // Plugins
  readonly wamHostGroup = SPrimitive.of<[id: string, key: string] | null>(null);
  readonly wamPlugins = LinkedMap.create<string, WAMAvailablePlugin>(new Map());
  readonly wamStatus = SPrimitive.of<"loading" | "ready">("loading");
  readonly faustEffects = Object.keys(FAUST_EFFECTS) as (keyof typeof FAUST_EFFECTS)[];
  // Project
  readonly projectStatus: SPrimitive<ProjectState>;
  readonly localFiles: LocalFilesystem = new LocalFilesystem();
  public openProjectPackage: ProjectPackage | null = null;
  // UI
  readonly openEffects: LinkedSet<DSPNode | MidiInstrument>;
  readonly activeSidePanel = LocalSPrimitive.create<"library" | "project" | "history" | "settings" | "help" | null>(
    "side-panel-active",
    "library",
  );
  readonly activeBottomPanel = LocalSPrimitive.create<"editor" | "debug" | "about" | null>("bottom-panel-active", null);

  // System
  renderer: AudioRenderer = null as any; // TODO: do this in a way that avoids the null?

  constructor() {
    if (FIREBASE_ENABLED) {
      this.firebaseApp = initFirebaseApp();
      this.firebaseAuth = getAuth(this.firebaseApp);
    } else {
      this.firebaseApp = null;
      this.firebaseAuth = null;
    }

    this.openEffects = LinkedSet.create();

    this.projectStatus = SPrimitive.of<ProjectState>({ status: "loading" });
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

    // IDEA: Maybe merge player and renderer?
    this.renderer = new AudioRenderer(new AnalizedPlayer());
    await this.localFiles.updateAudioLib();
    // once plugins have been loaded, so they're available to the project
    await this.initialLoadProject();
  }

  private async initialLoadProject() {
    //

    if (this.projectStatus.get().status === "loading") {
      const maybeProject = await ProjectPersistance.openLastProject(this.localFiles);
      if (maybeProject == null) {
        alert("Could not open project. Clearing");
        // ProjectPersistance.clearSaved();
        this.projectStatus.set({ status: "loaded", project: ProjectPersistance.emptyProject() });
      } else {
        this.projectStatus.set({ status: "loaded", project: maybeProject });
      }
    }
  }

  public loadProject(project: AudioProject) {
    if (this.projectStatus.get().status === "loading") {
      console.warn("Aleady loading a project");
      return;
    }
    this.projectStatus.set({ status: "loaded", project: project });
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
