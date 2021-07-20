import { useEffect, useState } from "react";
import firebase from "firebase";

export function usePambaFirebaseStoreRef(): firebase.storage.Reference | null {
  const [firebaseStoreRef, setFirebaseStoreRef] =
    useState<firebase.storage.Reference | null>(null);
  const [firebaseApp, setFirebaseApp] = useState<firebase.app.App | null>(null);

  // Firebase storage
  useEffect(function () {
    // Your web app's Firebase configuration
    const firebaseConfig = {
      apiKey: "AIzaSyBhdehFiYqwx3ahC5yCh6NTQgW7NxZMXvk",
      authDomain: "pamba-c5951.firebaseapp.com",
      projectId: "pamba-c5951",
      storageBucket: "pamba-c5951.appspot.com",
      messagingSenderId: "204416012722",
      appId: "1:204416012722:web:9e00b129f067d20c4894ab",
    };

    if (!firebase.apps.length) {
      // Initialize Firebase
      const app = firebase.initializeApp(firebaseConfig);
      setFirebaseApp(app);
    } else {
      setFirebaseApp(firebase.app());
    }
  }, []);

  useEffect(
    function () {
      if (!firebaseApp) {
        return;
      }
      const auth = firebase.auth();
      auth.onAuthStateChanged(function (user) {
        if (user) {
          console.log("Anonymous user signed-in.", user);
          setFirebaseStoreRef(firebase.storage().ref());
        } else {
          setFirebaseStoreRef(null);
          console.log(
            "There was no anonymous session. Creating a new anonymous user."
          );
          // Sign the user in anonymously since accessing Storage requires the user to be authorized.
          auth.signInAnonymously().catch(function (error) {
            if (error.code === "auth/operation-not-allowed") {
              window.alert(
                "Anonymous Sign-in failed. Please make sure that you have enabled anonymous " +
                  "sign-in on your Firebase project."
              );
            } else {
              setFirebaseStoreRef(firebase.storage().ref());
            }
          });
        }
      });
    },
    [firebaseApp]
  );

  return firebaseStoreRef;
}
