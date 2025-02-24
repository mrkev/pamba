import { WamDescriptor } from "@webaudiomodules/api";
import { FirebaseApp } from "firebase/app";
import { Auth, User, getAuth } from "firebase/auth";
import { DirtyObserver, SPrimitive, array } from "structured-state";
import { MidiDevices } from "../MidiDevices";
import { FIREBASE_ENABLED } from "../constants";
import { ProjectPackage } from "../data/ProjectPackage";
import { WAMKind } from "../data/WAMPackage";
import { LocalFilesystem } from "../data/localFilesystem";
import { FAUST_EFFECTS } from "../dsp/FAUST_EFFECTS";
import { FaustAudioEffect } from "../dsp/FaustAudioEffect";
import { ensureError } from "../ensureError";
import { initFirebaseApp } from "../firebase/firebaseConfig";
import type { MidiInstrument } from "../midi/MidiInstrument";
import { LocalSPrimitive } from "../ui/useLocalStorage";
import { PambaWamNode } from "../wam/PambaWamNode";
import { KINDS_SORT, PambaWAMPluginDescriptor, WAMPLUGINS } from "../wam/plugins";
import { WAMImport, fetchWam } from "../wam/fetchWam";
import { orderedMap } from "./data/SOrderedMap";
import { initAudioContext } from "./initAudioContext";
import { AnalizedPlayer } from "./io/AnalizedPlayer";
import { AudioRenderer } from "./io/AudioRenderer";
import { AudioProject } from "./project/AudioProject";
import { AudioStorage } from "./project/AudioStorage";
import { LinkedSet } from "./state/LinkedSet";
import { LinkedState } from "./state/LinkedState";

const dummyObj = array();

export type WAMAvailablePlugin = {
  kind: "WAMAvailablePlugin";
  import: WAMImport;
  descriptor: WamDescriptor;
  url: string;
  pluginKind: WAMKind;
};

type ProjectState = { status: "idle" } | { status: "loading" } | { status: "loaded"; project: AudioProject };

type Status = { is: "initing" } | { is: "ready" };

type MidiLearningStatus =
  | { status: "off" }
  | { status: "waiting" }
  | { status: "learning"; effect: FaustAudioEffect; address: string };

export class AppEnvironment {
  readonly status: SPrimitive<Status>;
  public readyPromise: Promise<void>;
  // Firebase
  readonly firebaseApp: FirebaseApp | null;
  readonly firebaseAuth: Auth | null;
  readonly firebaseUser = SPrimitive.of<User | null>(null);
  // Plugins
  readonly wamHostGroup = LinkedState.of<[id: string, key: string] | null>(null);
  readonly wamStatus = LinkedState.of<"loading" | "ready">("loading");
  readonly wamPlugins = orderedMap<string, { plugin: WAMAvailablePlugin; localDesc: PambaWAMPluginDescriptor }>();
  readonly faustEffects = Object.keys(FAUST_EFFECTS) as (keyof typeof FAUST_EFFECTS)[];
  // FS
  readonly localFiles: LocalFilesystem = null as any; // TODO: do this in a way that avoids the null?
  readonly audioStorage = SPrimitive.of<AudioStorage | null>(null);

  // Project
  readonly projectStatus: SPrimitive<ProjectState>;
  public projectDirtyObserver: DirtyObserver;
  readonly projectPacakge: LinkedState<ProjectPackage | null>; // null if never saved
  // UI
  readonly openEffects: LinkedSet<PambaWamNode | MidiInstrument>;
  readonly activeSidePanel = LocalSPrimitive.create<"library" | "project" | "history" | "midi" | "help" | null>(
    "side-panel-active",
    "library",
  );

  readonly activeBottomPanel = LocalSPrimitive.create<"editor" | "debug" | "about" | null>("bottom-panel-active", null);

  // MIDI
  readonly midiLearning: SPrimitive<MidiLearningStatus> = SPrimitive.of({ status: "off" });
  public midiDevices: MidiDevices = null as any; // TODO: do this in a way that avoids the null?

  // System
  public renderer: AudioRenderer = null as any; // TODO: do this in a way that avoids the null?

  readonly webgpu = SPrimitive.of<
    { status: "ok"; adapter: GPUAdapter; device: GPUDevice } | { status: "pending" } | { status: "error"; error: Error }
  >({ status: "pending" });

  constructor() {
    if (FIREBASE_ENABLED) {
      this.firebaseApp = initFirebaseApp();
      this.firebaseAuth = getAuth(this.firebaseApp);
    } else {
      this.firebaseApp = null;
      this.firebaseAuth = null;
    }

    this.openEffects = LinkedSet.create();
    this.status = SPrimitive.of({ is: "initing" });
    this.projectStatus = SPrimitive.of<ProjectState>({ status: "idle" });
    this.projectPacakge = LinkedState.of<ProjectPackage | null>(null); // null if never saved
    this.projectDirtyObserver = new DirtyObserver(dummyObj, "clean");

    this.readyPromise = new Promise((res) => {
      this.status._subscriptors.add(() => {
        if (this.status.get().is === "ready") {
          res();
        }
      });
    });
  }

  public loadProject(project: AudioProject) {
    appEnvironment.projectStatus.set({
      status: "loaded",
      project,
    });
    this.projectDirtyObserver = new DirtyObserver(project.allTracks, "clean");
  }

  async initAsync(liveAudioContext: AudioContext) {
    console.log("app environment asnyc init");
    const [audioContextInfo] = await Promise.all([initAudioContext(liveAudioContext)]);

    try {
      (this as any).localFiles = (await LocalFilesystem.initialize()) as any;

      // if (storage !== "no-storage") {
      const audioStorage = AudioStorage.init();
      this.audioStorage.set(audioStorage);

      const midiResult = await MidiDevices.initialize();
      if (midiResult.status === "error") {
        console.warn("no midi", midiResult.error);
      } else {
        this.midiDevices = midiResult.value;
      }

      // WebGPU
      if (!navigator.gpu) {
        throw new Error("WebGPU not supported in this browser.");
      }

      const adapter = await navigator.gpu.requestAdapter();
      if (adapter == null) {
        throw new Error("No appropriate GPUAdapter found.");
      }

      const device = await adapter.requestDevice({
        label: `Device ${new Date().getTime()}`,
      });

      this.webgpu.set({ status: "ok", adapter, device });
    } catch (e) {
      this.webgpu.set({ status: "error", error: ensureError(e) });
    }

    // Init wam host
    this.wamHostGroup.set(audioContextInfo.wamHostGroup);
    await Promise.all(
      WAMPLUGINS.map(async (localDesc) => {
        const plugin = await fetchWam(localDesc.url, localDesc.kind);
        if (plugin == null) {
          return;
        }
        this.wamPlugins.push(localDesc.url, { plugin, localDesc });
      }),
    );

    this.wamPlugins.sort(([, a], [, b]) => KINDS_SORT[a.localDesc.kind] - KINDS_SORT[b.localDesc.kind]);

    this.wamStatus.set("ready");

    // IDEA: Maybe merge player and renderer?
    this.renderer = new AudioRenderer(new AnalizedPlayer(liveAudioContext));

    this.status.set({ is: "ready" });
    // once plugins have been loaded, so they're available to the project
    // if (this.projectStatus.get().status === "loading") {
    //   await ProjectPersistance.openLastProject(this.localFiles);
    // }
  }

  public activeProject(): AudioProject | null {
    const projectStatus = this.projectStatus.get();
    if (projectStatus.status === "loaded") {
      return projectStatus.project;
    } else {
      return null;
    }
  }

  public ensureProject(): AudioProject {
    const projectStatus = this.projectStatus.get();
    switch (projectStatus.status) {
      case "idle":
      case "loading":
        throw new Error("project not available");
      case "loaded":
        return projectStatus.project;
    }
  }
}

export const appEnvironment = new AppEnvironment();
(window as any).appEnvironment = appEnvironment;
