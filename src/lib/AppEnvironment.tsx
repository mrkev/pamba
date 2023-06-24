import { User } from "firebase/auth";
import { SPrimitive } from "./state/LinkedState";

class AppEnvironment {
  readonly user = SPrimitive.of<User | null>(null);
}

export const appEnvironment = new AppEnvironment();
