import { FirebaseApp } from "firebase/app";
import { Auth, User, getAuth } from "firebase/auth";
import { MarkedSet, MarkedValue } from "marked-subbable";
import { DirtyObserver, SPrimitive, array } from "structured-state";
import { MidiDeviceManager } from "./MidiDeviceManager";
import { FIREBASE_ENABLED, MAX_NUMBER_OF_TRACKS, SOUND_FONT_URL } from "../constants";
import { ProjectPackage } from "../data/ProjectPackage";
import { LocalFilesystem } from "../data/localFilesystem";
import { FAUST_EFFECTS } from "../dsp/FAUST_EFFECTS";
import { FaustAudioEffect } from "../dsp/FaustAudioEffect";
import { ensureError } from "../ensureError";
import { initFirebaseApp } from "../firebase/firebaseConfig";
import type { MidiInstrument } from "../midi/MidiInstrument";
import { isInstrumentPlugin } from "../midi/isInstrumentPlugin";
import { LocalMValue } from "../ui/useLocalStorage";
import { nullthrows } from "../utils/nullthrows";
import { PambaWamNode } from "../wam/PambaWamNode";
import { AudioTrackModule } from "../wam/audiotrack/AudioTrackModule";
import { AudioTrackNode } from "../wam/audiotrack/AudioTrackNode";
import { fetchWam } from "../wam/fetchWam";
import { KINDS_SORT, WAMAvailablePlugin, WAMPLUGINS, wamAvailablePlugin } from "../wam/plugins";
import { MarkedOrderedMap } from "./data/SOrderedMap";
import { initAudioContext } from "./initAudioContext";
import { AnalizedPlayer } from "./io/AnalizedPlayer";
import { AudioRenderer } from "./io/AudioRenderer";
import { AudioProject } from "./project/AudioProject";
import { AudioStorage } from "./project/AudioStorage";

const dummyObj = array();

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
  readonly wamHostGroup = MarkedValue.create<[id: string, key: string] | null>(null);
  readonly wamStatus = MarkedValue.create<"loading" | "ready">("loading");
  readonly wamPlugins = MarkedOrderedMap.create<string, WAMAvailablePlugin>();
  readonly faustEffects = Object.keys(FAUST_EFFECTS) as (keyof typeof FAUST_EFFECTS)[];
  // FS
  readonly localFiles: LocalFilesystem = null as any; // TODO: do this in a way that avoids the null?
  readonly audioStorage = SPrimitive.of<AudioStorage | null>(null);

  // Project
  readonly projectStatus: SPrimitive<ProjectState>;
  public projectDirtyObserver: DirtyObserver;
  readonly projectPacakge: MarkedValue<ProjectPackage | null>; // null if never saved
  readonly projectCloseCallbacks: (() => void)[] = [];
  // UI
  readonly openEffects: MarkedSet<PambaWamNode | MidiInstrument>;
  readonly activeSidePanel = LocalMValue.create<"library" | "project" | "history" | "midi" | "help" | null>(
    "side-panel-active",
    "library",
  );

  readonly activeBottomPanel = LocalMValue.create<"editor" | "debug" | "about" | null>("bottom-panel-active", null);

  // MIDI
  readonly midiLearning = MarkedValue.create<MidiLearningStatus>({ status: "off" });
  public midiDevices: MidiDeviceManager = null as any; // TODO: do this in a way that avoids the null?

  // System
  public renderer: AudioRenderer = null as any; // TODO: do this in a way that avoids the null?

  // a bunch of audio track wams ready for usage
  public readonly audioTrackWAMBank: AudioTrackModule[] = [];

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

    this.openEffects = MarkedSet.create();
    this.status = SPrimitive.of({ is: "initing" });
    this.projectStatus = SPrimitive.of<ProjectState>({ status: "idle" });
    this.projectPacakge = MarkedValue.create<ProjectPackage | null>(null); // null if never saved
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
    if (this.projectStatus.get().status === "loaded") {
      this.closeProject();
    }

    this.projectStatus.set({
      status: "loaded",
      project,
    });
    (window as any).project = project;
    this.projectDirtyObserver = new DirtyObserver(project.allTracks, "clean");
  }

  routeMidi(event: MIDIMessageEvent) {
    const projectStatus = this.projectStatus.get();
    if (projectStatus.status !== "loaded") {
      return;
    }

    projectStatus.project.midi.onMidi(event);
  }

  async initAsync(liveAudioContext: AudioContext) {
    console.log("app environment asnyc init");
    const [audioContextInfo] = await Promise.all([initAudioContext(liveAudioContext)]);

    try {
      (this as any).localFiles = (await LocalFilesystem.initialize()) as any;

      // if (storage !== "no-storage") {
      const audioStorage = AudioStorage.init();
      this.audioStorage.set(audioStorage);

      const midiResult = await MidiDeviceManager.initialize();
      if (midiResult.status === "error") {
        console.warn("no midi", midiResult.error);
      } else {
        this.midiDevices = midiResult.value;
        const unsubscribe = this.midiDevices.events.addEventListener("midimessage", this.routeMidi.bind(this));
        this.projectCloseCallbacks.push(unsubscribe);
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
      // load wam plugins
      WAMPLUGINS.map(async (localDesc) => {
        const plugin = await fetchWam(localDesc.url, localDesc.kind);
        if (plugin == null) {
          return;
        }
        this.wamPlugins.push(localDesc.url, wamAvailablePlugin(plugin, localDesc));
      }),
    );

    this.wamPlugins.sort(([, a], [, b]) => KINDS_SORT[a.pluginKind] - KINDS_SORT[b.pluginKind]);
    this.wamStatus.set("ready");

    // IDEA: Maybe merge player and renderer?
    this.renderer = new AudioRenderer(new AnalizedPlayer(liveAudioContext));
    const [groupId] = audioContextInfo.wamHostGroup;

    for (let i = 0; i < MAX_NUMBER_OF_TRACKS; i++) {
      const audioTrackModule = (await AudioTrackModule.createInstance<AudioTrackNode>(
        groupId,
        liveAudioContext,
      )) as AudioTrackModule;
      this.audioTrackWAMBank.push(audioTrackModule);
    }

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

  public closeProject() {
    let cb;
    while ((cb = this.projectCloseCallbacks.pop())) {
      cb();
    }
  }
}

export const appEnvironment = new AppEnvironment();
(window as any).appEnvironment = appEnvironment;

export function liveWamHostGroupId() {
  return nullthrows(appEnvironment.wamHostGroup.get())[0];
}

export function defaultInstrument() {
  const plugin = nullthrows(
    appEnvironment.wamPlugins.get(SOUND_FONT_URL),
    `unexpected default instrument is not an instrument`,
  );

  if (!isInstrumentPlugin(plugin)) {
    throw new Error("unexpected instrument plugin is no longer an instrument");
  }

  return plugin;
}
