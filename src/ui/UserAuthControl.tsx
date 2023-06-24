import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useState } from "react";
import { appEnvironment } from "../lib/AppEnvironment";
import { useLinkedState } from "../lib/state/LinkedState";
import { useModalDialog } from "./useModalDialog";
import { utility } from "./utility";

export function UserAuthControl() {
  const [firebaseUser] = useLinkedState(appEnvironment.firebaseUser);
  const [modal, showModal] = useModalDialog(() => <LoginDialog />);
  const auth = getAuth(appEnvironment.firebaseApp);

  const onFormSubmit = async (formData: FormData) => {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const mode = formData.get("mode");

    try {
      const userCredential =
        mode === "login"
          ? await signInWithEmailAndPassword(auth, email, password)
          : await createUserWithEmailAndPassword(auth, email, password);

      appEnvironment.firebaseUser.set(userCredential.user);
    } catch (error: any) {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.error(error);
    }
  };

  console.log("firebaseUser", firebaseUser);

  return (
    <>
      {modal}
      {firebaseUser == null ? (
        "--"
      ) : firebaseUser.isAnonymous ? (
        <button
          className={utility.button}
          onClick={() => {
            showModal(onFormSubmit);
          }}
        >
          sign-in
        </button>
      ) : (
        <>
          {firebaseUser.displayName ?? firebaseUser.email}

          <button
            className={utility.button}
            onClick={async () => {
              try {
                await signOut(auth);
              } catch (error: any) {
                const errorCode = error.code;
                const errorMessage = error.message;
                console.error(error);
              }
            }}
          >
            sign-out
          </button>
        </>
      )}
    </>
  );
}

export function LoginDialog() {
  const [mode, setMode] = useState<"signup" | "login">("login");

  return (
    <>
      <div style={{ userSelect: "auto" }}>
        <span
          style={mode === "signup" ? { fontWeight: "bold" } : { color: "#0000EE", textDecoration: "underline" }}
          onClick={() => {
            console.log("FOO");
            setMode("signup");
          }}
        >
          signup
        </span>
        {" | "}
        <span
          style={mode === "login" ? { fontWeight: "bold" } : { color: "#0000EE", textDecoration: "underline" }}
          onClick={() => setMode("login")}
        >
          login
        </span>
      </div>
      <input type="hidden" name="mode" value={mode} />
      <label>
        email:
        <input type="email" name="email" />
      </label>
      <label>
        password:
        <input type="password" name="password" />
      </label>

      <div>
        <button value="cancel" formMethod="dialog">
          Cancel
        </button>
        <button value="default">{mode === "signup" ? "Sign-up" : "Log-in"}</button>
      </div>
    </>
  );
}
