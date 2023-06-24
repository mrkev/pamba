import { FirebaseApp } from "firebase/app";
import { User } from "firebase/auth";
import { SPrimitive } from "./state/LinkedState";
import { initFirebaseApp } from "../firebase/firebaseConfig";
import { liveAudioContext } from "../constants";
import { LinkedMap } from "./state/LinkedMap";
import { WAMImport } from "../wam/wam";

const plugin1Url = "https://mainline.i3s.unice.fr/wam2/packages/StonePhaserStereo/index.js";
const plugin2Url = "https://mainline.i3s.unice.fr/wam2/packages/BigMuff/index.js";

async function loadWam(pluginUrl: string): Promise<WAMImport | null> {
  console.log("WAM: LOADING fromURLlllll", pluginUrl);
  const rawModule = await import(/* @vite-ignore */ pluginUrl);
  if (rawModule == null) {
    console.error("could not import", rawModule);
    return null;
  }
  const WAM: WAMImport = rawModule.default;
  return WAM;
}

class AppEnvironment {
  readonly firebaseApp: FirebaseApp;
  readonly firebaseUser = SPrimitive.of<User | null>(null);
  readonly wamHostGroup = SPrimitive.of<[id: string, key: string] | null>(null);
  readonly wamPlugins = LinkedMap.create<string, WAMImport>(new Map());

  constructor() {
    this.firebaseApp = initFirebaseApp();
    // async inits

    void (async () => {
      // Init wam host
      const { default: initializeWamHost } = await import("../../packages/sdk/src/initializeWamHost");
      const [hostGroupId, hostGroupKey] = await initializeWamHost(liveAudioContext);
      this.wamHostGroup.set([hostGroupId, hostGroupKey]);

      // Load WAM plugins
      const plugin1 = await loadWam(plugin1Url);
      if (plugin1) {
        this.wamPlugins.set(plugin1Url, plugin1);
      }

      const plugin2 = await loadWam(plugin2Url);
      if (plugin2) {
        this.wamPlugins.set(plugin2Url, plugin2);
      }
    })();
  }
}

export const appEnvironment = new AppEnvironment();

(window as any).appEnvironment = appEnvironment;
