import { User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import { usePrimitive } from "structured-state";
import { anonymousSignIn, useFirebaseAuthState } from "../../firebase/getFirebase";
import { appEnvironment } from "../../lib/AppEnvironment";
import { ignorePromise } from "../../utils/ignorePromise";
import { useModalDialog } from "../useModalDialog";
import { utility } from "../utility";

export function UserAuthControl() {
  const [firebaseUser] = usePrimitive(appEnvironment.firebaseUser);
  const [modal, showModal] = useModalDialog(() => <LoginDialog />);

  useFirebaseAuthState(
    useCallback((user: User | null) => {
      // should be the only setter for firebaseUser. It'll catch everything
      appEnvironment.firebaseUser.set(user);
    }, []),
  );

  useEffect(() => {
    const { firebaseAuth } = appEnvironment;
    if (firebaseAuth == null) {
      return;
    }
    ignorePromise(
      (async () => {
        const result = await anonymousSignIn(firebaseAuth);
        if (result != null) {
          console.log("Anonymous user signed-in.");
        }
      })(),
    );
  }, []);

  const onFormSubmit = async (formData: FormData) => {
    const { firebaseAuth } = appEnvironment;
    if (firebaseAuth == null) {
      throw new Error("firebase disabled");
    }

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const mode = formData.get("mode");

    try {
      const _userCredential =
        mode === "login"
          ? await signInWithEmailAndPassword(firebaseAuth, email, password)
          : await createUserWithEmailAndPassword(firebaseAuth, email, password);

      // firebaseUser.set(userCredential.user);
    } catch (error: any) {
      const _errorCode = error.code;
      const _errorMessage = error.message;
      console.error(error);
    }
  };

  const { firebaseAuth } = appEnvironment;
  if (firebaseAuth == null) {
    return <div>firebase disabled</div>;
  }

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
                await signOut(firebaseAuth);
              } catch (error: any) {
                // const errorCode = error.code;
                // const errorMessage = error.message;
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
        <button value="cancel">Cancel</button>
        <button value="submit">{mode === "signup" ? "Sign-up" : "Log-in"}</button>
      </div>
    </>
  );
}
