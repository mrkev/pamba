import { FirebaseError } from "firebase/app";
import { Auth, User, getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { Database, getDatabase } from "firebase/database";
import { StorageReference, getStorage, ref } from "firebase/storage";
import { appEnvironment } from "../lib/AppEnvironment";

const SKIP_FIREBASE = false;

export function getFirebaseAuth(): Auth {
  return getAuth(appEnvironment.firebaseApp);
}

let storedUser: User | null | "no-user" | Promise<User | "no-user"> = null;

export async function getFirebaseUser(): Promise<User | "no-user"> {
  if (SKIP_FIREBASE) {
    storedUser = "no-user";
    return storedUser;
  }

  if (storedUser != null) {
    return storedUser;
  }

  const auth = getAuth(appEnvironment.firebaseApp);
  const promise = new Promise<User | "no-user">((res) => {
    onAuthStateChanged(auth, async function (user) {
      if (user) {
        console.log("Anonymous user signed-in.", user);
        storedUser = user;
        res(user);
      } else {
        console.log("There was no anonymous session. Creating a new anonymous user.");
        // Sign the user in anonymously since accessing Storage requires the user to be authorized.

        try {
          const userCredential = await signInAnonymously(auth);
          console.log("New anonymous session successfully.");
          storedUser = userCredential.user;
          res(storedUser);
        } catch (error) {
          if ((error as FirebaseError).code === "auth/operation-not-allowed") {
            window.alert(
              "Anonymous Sign-in failed. Please make sure that you have enabled anonymous " +
                "sign-in on your Firebase project."
            );
          } else {
            window.alert("There was some issue signing in");
          }
          storedUser = "no-user";
          res(storedUser);
        }
      }
    });
  });

  storedUser = promise;
  return promise;
}

export async function getFirebaseStorage(): Promise<StorageReference | "no-storage"> {
  const user = await getFirebaseUser();
  console.log("USER");

  if (SKIP_FIREBASE || user === "no-user") {
    return "no-storage";
  }

  const storage = getStorage(appEnvironment.firebaseApp);
  return ref(storage);
}

export function getPambaFirebaseDBRef(): Database | null {
  // const firebaseApp = useFirebaseApp(firebaseConfig);
  const database = getDatabase() || null;
  return database;
}
