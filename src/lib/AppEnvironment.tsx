import { FirebaseApp } from "firebase/app";
import { Auth, User, getAuth } from "firebase/auth";
import { WAM_PLUGINS } from "../constants";
import { initFirebaseApp } from "../firebase/firebaseConfig";
import { AudioContextInfo } from "./initAudioContext";
import { LinkedMap } from "./state/LinkedMap";
import { SPrimitive } from "./state/LinkedState";
import { WAMImport, fetchWam } from "../wam/wam";
import { WamDescriptor } from "@webaudiomodules/api";

export type WAMAvailablePlugin = {
  // midi out, audio out, midi to audio, audio to audio
  kind: "-m" | "-a" | "m-a" | "a-a";
  import: WAMImport;
  descriptor: WamDescriptor;
};

export class AppEnvironment {
  readonly firebaseApp: FirebaseApp;
  readonly firebaseAuth: Auth;
  readonly firebaseUser = SPrimitive.of<User | null>(null);
  readonly wamHostGroup = SPrimitive.of<[id: string, key: string] | null>(null);
  // Plugins
  readonly wamPlugins = LinkedMap.create<string, WAMAvailablePlugin>(new Map());
  readonly faustEffects = ["PANNER", "REVERB"] as const;

  constructor() {
    this.firebaseApp = initFirebaseApp();
    this.firebaseAuth = getAuth(this.firebaseApp);
  }

  async initAsync(audioContextInfo: AudioContextInfo) {
    // Init wam host
    this.wamHostGroup.set(audioContextInfo.wamHostGroup);
    await Promise.all(
      WAM_PLUGINS.map(async ({ url, kind }) => {
        const plugin = await fetchWam(url, kind);
        if (plugin == null) {
          return;
        }
        this.wamPlugins.set(url, plugin);
      })
    );
  }
}

export const appEnvironment = new AppEnvironment();
(window as any).appEnvironment = appEnvironment;
