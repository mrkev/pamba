import { FirebaseApp } from "firebase/app";
import { User } from "firebase/auth";
import { SPrimitive } from "./state/LinkedState";

class AppEnvironment {
  readonly firebaseApp = SPrimitive.of<FirebaseApp | null>(null);
  readonly firebaseUser = SPrimitive.of<User | null>(null);
}

export const appEnvironment = new AppEnvironment();

(window as any).appEnvironment = appEnvironment;
