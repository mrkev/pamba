import { useEffect, useState } from "react";
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBhdehFiYqwx3ahC5yCh6NTQgW7NxZMXvk",
  authDomain: "pamba-c5951.firebaseapp.com",
  projectId: "pamba-c5951",
  storageBucket: "pamba-c5951.appspot.com",
  messagingSenderId: "204416012722",
  appId: "1:204416012722:web:9e00b129f067d20c4894ab",
};

export function useFirebaseApp(config: typeof firebaseConfig): firebase.app.App | null {
  const [firebaseApp, setFirebaseApp] = useState<firebase.app.App | null>(null);

  // Firebase storage
  useEffect(
    function () {
      if (!firebase.apps.length) {
        // Initialize Firebase
        const app = firebase.initializeApp(config);
        setFirebaseApp(app);
      } else {
        setFirebaseApp(firebase.app());
      }
    },
    [config]
  );

  return firebaseApp;
}

const SKIP_FIREBASE = false;

export function useFirebaseUser(): firebase.User | null {
  const firebaseApp = useFirebaseApp(firebaseConfig);
  const [firebaseUser, setFirebaseUser] = useState<firebase.User | null>(null);

  useEffect(() => {
    if (SKIP_FIREBASE) {
      return;
    }

    if (!firebaseApp) {
      return;
    }
    // No need to re-sign in if we already have a user
    if (firebaseUser !== null) {
      return;
    }

    const auth = firebase.auth();
    auth.onAuthStateChanged(function (user) {
      if (user) {
        console.log("Anonymous user signed-in.", user);
        setFirebaseUser(user);
      } else {
        setFirebaseUser(null);
        console.log("There was no anonymous session. Creating a new anonymous user.");
        // Sign the user in anonymously since accessing Storage requires the user to be authorized.
        auth
          .signInAnonymously()
          .then((userCredential) => {
            console.log("New anonymous session successfully.");
            setFirebaseUser(userCredential.user);
          })
          .catch(function (error) {
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
  }, [firebaseApp, firebaseUser]);

  return firebaseUser;
}

export function usePambaFirebaseStoreRef(): firebase.storage.Reference | null {
  const [firebaseStoreRef, setFirebaseStoreRef] = useState<firebase.storage.Reference | null>(null);

  const firebaseApp = useFirebaseApp(firebaseConfig);
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

    setFirebaseStoreRef(firebase.storage().ref());
  }, [firebaseApp, firebaseStoreRef, user]);

  return firebaseStoreRef;
}

export function usePambaFirebaseDBRef(): firebase.database.Database | null {
  const firebaseApp = useFirebaseApp(firebaseConfig);

  const database = firebaseApp?.database() || null;
  return database;
}
