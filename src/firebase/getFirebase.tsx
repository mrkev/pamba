import { FirebaseError } from "firebase/app";
import { Auth, NextOrObserver, User, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { StorageReference, getStorage, ref } from "firebase/storage";
import { useEffect } from "react";
import { appEnvironment } from "../lib/AppEnvironment";

export function useFirebaseAuthState(observer: NextOrObserver<User>) {
  const auth = appEnvironment.firebaseAuth;
  useEffect(() => {
    return onAuthStateChanged(auth, observer);
  }, [auth, observer]);
}

export async function logOff() {
  const auth = appEnvironment.firebaseAuth;
  const unsubscribe = onAuthStateChanged(auth, (user) => {});
}

export async function anonymousSignIn(auth: Auth) {
  try {
    const credential = await signInAnonymously(auth);
    console.log("New anonymous session successfully.");
    return credential;
  } catch (error) {
    if ((error as FirebaseError).code === "auth/operation-not-allowed") {
      window.alert(
        "Anonymous Sign-in failed. Please make sure that you have enabled anonymous " +
          "sign-in on your Firebase project."
      );
    } else {
      window.alert("There was some issue signing in");
    }
    return null;
  }
}

export async function getFirebaseStorage(): Promise<StorageReference | "no-storage"> {
  const storage = getStorage(appEnvironment.firebaseApp);
  return ref(storage);
}
