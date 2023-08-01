import { useEffect, useState } from "react";
import { Auth, User, getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { Database, getDatabase } from "firebase/database";
import { StorageReference, getStorage, ref } from "firebase/storage";
import { appEnvironment } from "../lib/AppEnvironment";
import { useLinkedState } from "../lib/state/LinkedState";

export const SKIP_FIREBASE = false;

export function useFirebaseAuth(): Auth {
  return getAuth(appEnvironment.firebaseApp);
}

export function useFirebaseUser(): User | null {
  const [firebaseUser, setFirebaseUser] = useLinkedState(appEnvironment.firebaseUser);
  const [signingIn, setSigningIn] = useState<boolean>(false);

  useEffect(() => {
    if (SKIP_FIREBASE) {
      return;
    }

    // No need to re-sign in if we already have a user
    if (firebaseUser != null) {
      return;
    }

    if (signingIn) {
      return;
    }

    setSigningIn(true);
    const auth = getAuth(appEnvironment.firebaseApp);
    onAuthStateChanged(auth, function (user) {
      if (user) {
        console.log("Anonymous user signed-in.", user);
        setFirebaseUser(user);
        setSigningIn(false);
      } else {
        setFirebaseUser(null);
        console.log("There was no anonymous session. Creating a new anonymous user.");
        // Sign the user in anonymously since accessing Storage requires the user to be authorized.
        signInAnonymously(auth)
          .then((userCredential) => {
            console.log("New anonymous session successfully.");
            setFirebaseUser(userCredential.user);
            setSigningIn(false);
          })
          .catch(function (error) {
            setSigningIn(false);
            if (error.code === "auth/operation-not-allowed") {
              window.alert(
                "Anonymous Sign-in failed. Please make sure that you have enabled anonymous " +
                  "sign-in on your Firebase project."
              );
            } else {
              window.alert("There was some issue signing in");
            }
          });
      }
    });
  }, [firebaseUser, setFirebaseUser, signingIn]);

  return firebaseUser;
}

export function usePambaFirebaseStoreRef(): StorageReference | null {
  const [firebaseStoreRef, setFirebaseStoreRef] = useState<StorageReference | null>(null);

  const user = useFirebaseUser();

  useEffect(() => {
    if (SKIP_FIREBASE) {
      return;
    }

    // No need to re-sign in if we already have a firebaseStoreRef
    if (firebaseStoreRef !== null) {
      return;
    }

    if (user == null) {
      return;
    }

    const storage = getStorage(appEnvironment.firebaseApp);

    setFirebaseStoreRef(ref(storage));
  }, [firebaseStoreRef, user]);

  return firebaseStoreRef;
}

export function usePambaFirebaseDBRef(): Database | null {
  // const firebaseApp = useFirebaseApp(firebaseConfig);
  const database = getDatabase() || null;
  return database;
}
