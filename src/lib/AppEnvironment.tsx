import { WamDescriptor } from "@webaudiomodules/api";
import { FirebaseApp } from "firebase/app";
import { Auth, User, getAuth } from "firebase/auth";
import { FIREBASE_ENABLED, WAM_PLUGINS } from "../constants";
import { AudioPackage } from "../data/AudioPackage";
import { ProjectPackage } from "../data/ProjectPackage";
import { LocalFilesystem } from "../data/localFilesystem";
import type { DSPNode } from "../dsp/DSPNode";
import { FAUST_EFFECTS } from "../dsp/FAUST_EFFECTS";
import { initFirebaseApp } from "../firebase/firebaseConfig";
import type { MidiInstrument } from "../midi/MidiInstrument";
import { LocalSPrimitive } from "../ui/useLocalStorage";
import { WAMImport, fetchWam } from "../wam/wam";
import { AnalizedPlayer } from "./AnalizedPlayer";
import { AudioRenderer } from "./AudioRenderer";
import { ProjectPersistance } from "./ProjectPersistance";
import { initAudioContext } from "./initAudioContext";
import { AudioProject } from "./project/AudioProject";
import { LinkedMap } from "./state/LinkedMap";
import { LinkedSet } from "./state/LinkedSet";
import { LinkedState } from "./state/LinkedState";
import { exhaustive } from "./state/Subbable";

export type WAMAvailablePlugin = {
  // midi out, audio out, midi to audio, audio to audio
  kind: "-m" | "-a" | "m-a" | "a-a";
  import: WAMImport;
  descriptor: WamDescriptor;
  url: string;
};

type ProjectState = { status: "loading" } | { status: "loaded"; project: AudioProject };

export class AppEnvironment {
  // Firebase
  readonly firebaseApp: FirebaseApp | null;
  readonly firebaseAuth: Auth | null;
  readonly firebaseUser = LinkedState.of<User | null>(null);
  // Plugins
  readonly wamHostGroup = LinkedState.of<[id: string, key: string] | null>(null);
  readonly wamStatus = LinkedState.of<"loading" | "ready">("loading");
  readonly wamPlugins = LinkedMap.create<string, WAMAvailablePlugin>(new Map());
  readonly faustEffects = Object.keys(FAUST_EFFECTS) as (keyof typeof FAUST_EFFECTS)[];
  // FS
  readonly localFiles: LocalFilesystem = new LocalFilesystem();
  // Project
  readonly projectStatus: LinkedState<ProjectState>;
  readonly projectPacakge: LinkedState<ProjectPackage | null>; // null if never saved
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

    this.projectStatus = LinkedState.of<ProjectState>({ status: "loading" });
    this.projectPacakge = LinkedState.of<ProjectPackage | null>(null); // null if never saved
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

    await this.localFiles.projectLib._initState();
    await this.localFiles.audioLib._initState();
    // once plugins have been loaded, so they're available to the project
    if (this.projectStatus.get().status === "loading") {
      await ProjectPersistance.openLastProject(this.localFiles);
    }
  }

  public async loadAudio(path: string): Promise<AudioPackage> {
    const localRegex = new RegExp("^/projects/(.+)/audiolib/(.+)", "i");
    const globalRegex = new RegExp("^/audiolib/(.+)", "i");

    const projectMatch = localRegex.exec(path);
    const globalMatch = globalRegex.exec(path);

    if (projectMatch != null) {
      const [_, projectId, audioName] = projectMatch;
      return this.loadLocalAudio(projectId, audioName, path);
    }
    if (globalMatch != null) {
      const [_, audioName] = globalMatch;

      const audioLib = await this.localFiles.audioLib.dir();
      const audioPackageDir = await audioLib.open("dir", audioName);
      if (audioPackageDir === "not_found") {
        throw new Error(`didn't find audio in audiolib ${path}`);
      }
      return AudioPackage.existingPackage(audioPackageDir);
    }

    throw new Error("Invalid audio path " + path);
  }

  private async loadLocalAudio(projectId: string, audioName: string, path: string) {
    const projectStatus = this.projectStatus.get();
    switch (projectStatus.status) {
      case "loading":
        // TODO: can maybe wait for project to load?
        throw new Error("TODO");
      case "loaded":
        // continue
        break;

      default:
        exhaustive(projectStatus);
    }

    if (projectStatus.project.projectId !== projectId) {
      throw new Error(
        `Can't load audio outside current project: project: ${projectStatus.project.projectId}, path: ${path}`,
      );
    }

    const projectPackage = this.projectPacakge.get();
    if (projectPackage == null || projectPackage.id !== projectId) {
      throw new Error(`loadaudio: package mismatch. project package ${projectPackage?.id}, path: ${path}`);
    }

    const result = await projectPackage.audioLibRef.open(audioName);
    if (result === "not_found") {
      throw new Error(`auido ${audioName} not found in project ${projectId}`);
    }

    return result;
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
