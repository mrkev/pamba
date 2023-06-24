import { FirebaseApp } from "firebase/app";
import { User } from "firebase/auth";
import { SPrimitive } from "./state/LinkedState";
import { initFirebaseApp } from "../firebase/firebaseConfig";

class AppEnvironment {
  readonly firebaseApp: FirebaseApp;
  readonly firebaseUser = SPrimitive.of<User | null>(null);

  constructor() {
    this.firebaseApp = initFirebaseApp();
  }
}

export const appEnvironment = new AppEnvironment();

(window as any).appEnvironment = appEnvironment;
