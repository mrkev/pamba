import { FirebaseApp } from "firebase/app";
import { User } from "firebase/auth";
import { SPrimitive } from "./state/LinkedState";
import { initFirebaseApp } from "../firebase/firebaseConfig";
import { liveAudioContext } from "../constants";

class AppEnvironment {
  readonly firebaseApp: FirebaseApp;
  readonly firebaseUser = SPrimitive.of<User | null>(null);
  readonly wamHostGroup = SPrimitive.of<[id: string, key: string] | null>(null);

  constructor() {
    this.firebaseApp = initFirebaseApp();
    // async inits

    void (async () => {
      const { default: initializeWamHost } = await import("../../packages/sdk/src/initializeWamHost");
      const [hostGroupId, hostGroupKey] = await initializeWamHost(liveAudioContext);
      this.wamHostGroup.set([hostGroupId, hostGroupKey]);
    })();
  }
}

export const appEnvironment = new AppEnvironment();

(window as any).appEnvironment = appEnvironment;
