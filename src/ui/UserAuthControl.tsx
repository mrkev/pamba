import { GoogleAuthProvider, getAuth, signInWithPopup } from "firebase/auth";
import { appEnvironment } from "../lib/AppEnvironment";
import { useLinkedState } from "../lib/state/LinkedState";
import { utility } from "./utility";

export function UserAuthControl() {
  const [firebaseUser] = useLinkedState(appEnvironment.firebaseUser);

  return firebaseUser == null ? (
    "--"
  ) : firebaseUser.isAnonymous ? (
    <button
      className={utility.button}
      onClick={async () => {
        const auth = getAuth();

        const provider = new GoogleAuthProvider();

        try {
          const result = await signInWithPopup(auth, provider);

          // This gives you a Google Access Token. You can use it to access the Google API.
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (!credential) {
            throw new Error("No credentials returned!");
          }

          // can use the token to call google apis
          const token = credential.accessToken;
          // The signed-in user info.
          const user = result.user;

          // IdP data available using getAdditionalUserInfo(result)
          // ...
          appEnvironment.firebaseUser.set(user);

          console.log("signed in", user);
        } catch (error: any) {
          // Handle Errors here.
          const errorCode = error.code;
          const errorMessage = error.message;
          // The email of the user's account used.
          const email = error.customData.email;
          // The AuthCredential type that was used.
          const credential = GoogleAuthProvider.credentialFromError(error);
          // ...
          console.error(error);
        }
      }}
    >
      sign-in
    </button>
  ) : (
    firebaseUser.displayName
  );
}
