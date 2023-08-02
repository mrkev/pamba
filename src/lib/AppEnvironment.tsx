import { FirebaseApp } from "firebase/app";
import { User } from "firebase/auth";
import { SPrimitive } from "./state/LinkedState";
import { initFirebaseApp } from "../firebase/firebaseConfig";
import { liveAudioContext } from "../constants";
import { LinkedMap } from "./state/LinkedMap";
import { WAMImport } from "../wam/wam";
import { WamDescriptor } from "@webaudiomodules/api";
import { ignorePromise } from "../utils/ignorePromise";

export async function fetchWam(
  pluginUrl: string,
  kind: "-m" | "-a" | "m-a" | "a-a"
): Promise<WAMAvailablePlugin | null> {
  console.log("WAM: LOADING fromURLlllll", pluginUrl);
  const rawModule = await import(/* @vite-ignore */ pluginUrl);
  if (rawModule == null) {
    console.error("could not import", rawModule);
    return null;
  }
  const plugin: WAMImport = rawModule.default;

  if (plugin == null) {
    console.warn(`error: loading wam at url ${pluginUrl}`);
    return null;
  }
  // TODO: propery initialize instead to get proper metadata?
  const descriptor = new (plugin as any)().descriptor;
  // console.log(descriptor);
  return { import: plugin, descriptor, kind };
}

type WAMAvailablePlugin = {
  // midi out, audio out, midi to audio, audio to audio
  kind: "-m" | "-a" | "m-a" | "a-a";
  import: WAMImport;
  descriptor: WamDescriptor;
};

export class AppEnvironment {
  readonly firebaseApp: FirebaseApp;
  readonly firebaseUser = SPrimitive.of<User | null>(null);
  readonly wamHostGroup = SPrimitive.of<[id: string, key: string] | null>(null);
  readonly wamPlugins = LinkedMap.create<string, WAMAvailablePlugin>(new Map());
  readonly faustEffects = ["PANNER", "REVERB"] as const;

  private static readonly WAM_PLUGINS: { url: string; kind: "-m" | "-a" | "m-a" | "a-a" }[] = [
    { url: "https://mainline.i3s.unice.fr/wam2/packages/StonePhaserStereo/index.js", kind: "a-a" },
    { url: "https://mainline.i3s.unice.fr/wam2/packages/BigMuff/index.js", kind: "a-a" },
    { url: "https://mainline.i3s.unice.fr/wam2/packages/obxd/index.js", kind: "m-a" },
    { url: "../midi/pianoroll/index.js", kind: "-m" },
  ];
  static readonly PIANO_ROLL_PLUGIN_URL = "../midi/pianoroll/index.js";

  constructor() {
    this.firebaseApp = initFirebaseApp();
    ignorePromise(this.initAsync());
  }

  async initAsync() {
    // Init wam host
    const { default: initializeWamHost } = await import("../../packages/sdk/src/initializeWamHost");
    const [hostGroupId, hostGroupKey] = await initializeWamHost(liveAudioContext);
    this.wamHostGroup.set([hostGroupId, hostGroupKey]);

    await Promise.all(
      AppEnvironment.WAM_PLUGINS.map(async ({ url, kind }) => {
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
