import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { LinkedState, useLinkedState } from "../lib/state/LinkedState";
import { subscribe } from "../lib/state/Subbable";
import { nullthrows } from "../utils/nullthrows";
import React from "react";
import { useStyles } from "./ConfirmDialog";

const confirmationModal = LinkedState.of<
  | { status: "open"; message: string; defaultValue?: string; okString?: string; cancelString?: string }
  | { status: "closed"; value: string | null }
>({
  status: "closed",
  value: "cancel",
});

export function doPrompt(
  message: string,
  defaultValue?: string,
  okString?: string,
  cancelString?: string,
): Promise<string | null> {
  if (confirmationModal.get().status === "open") {
    console.error("Confirmation modal already open.");
  }

  return new Promise((res) => {
    confirmationModal.set({ status: "open", message, defaultValue, okString, cancelString });
    const usubscribe = subscribe(confirmationModal, () => {
      const value = confirmationModal.get();
      if (value.status === "open") {
        console.error("Confirmation modal already open!");
        return;
      } else {
        res(value.value);
      }
      usubscribe();
    });
  });
}

export function PromptDialog() {
  const styles = useStyles();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  // const okRef = useRef<HTMLInputElement>(null);
  const [prompt] = useLinkedState(confirmationModal);
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    if (prompt.status === "open") {
      dialogRef.current?.showModal();
      setValue(prompt.defaultValue ?? null);
      // okRef.current?.focus();
    } else {
      dialogRef.current?.close();
    }
  }, [prompt]);

  const onSubmit = () => {
    confirmationModal.set({ status: "closed", value: value });
  };

  const onCancel = () => {
    confirmationModal.set({ status: "closed", value: null });
  };

  return ReactDOM.createPortal(
    <dialog
      className={styles.dialog}
      ref={dialogRef}
      open={false}
      onClose={() => {
        // sync state, to closed. Happens when user hits ESC for example
        if (prompt.status === "open") {
          confirmationModal.set({ status: "closed", value: "cancel" });
        }
      }}
    >
      {prompt.status === "closed" ? null : (
        <>
          <span className={styles.message}>
            {prompt.message.split("\n").map((str, i) => (
              <React.Fragment key={i}>
                {str}
                <br />
              </React.Fragment>
            ))}
          </span>
          <input
            autoFocus
            style={{ margin: "0px 24px 12px 24px" }}
            value={value ?? ""}
            onChange={(e) => setValue(e.target.value)}
            placeholder={prompt.defaultValue}
          ></input>
          <div className={styles.buttons}>
            <button className={styles.button} onClick={onCancel}>
              {prompt.cancelString ?? "Cancel"}
            </button>
            <button className={styles.button} ref={okRef} onClick={onSubmit} autoFocus={true}>
              {prompt.okString ?? "OK"}
            </button>
          </div>
        </>
      )}
    </dialog>,
    // TODO: combine with confirm dialogs into a single dialog queue
    nullthrows(document.querySelector("#prompt-dialogs")),
  );
}
