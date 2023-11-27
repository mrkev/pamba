import { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { createUseStyles } from "react-jss";
import { SPrimitive, useLinkedState } from "../lib/state/LinkedState";
import { subscribe } from "../lib/state/Subbable";
import { nullthrows } from "../utils/nullthrows";

const confirmationModal = SPrimitive.of<
  | { status: "open"; message: string; okString?: string; noString?: string; cancelString?: string }
  | { status: "closed"; value: "yes" | "no" | "cancel" }
>({
  status: "closed",
  value: "cancel",
});

export function doConfirm(
  message: string,
  okString?: string,
  noString?: string,
  cancelString?: string,
): Promise<"yes" | "no" | "cancel"> {
  if (confirmationModal.get().status === "open") {
    console.error("Confirmation modal already open.");
  }

  return new Promise((res) => {
    confirmationModal.set({ status: "open", message, okString, noString, cancelString });
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

export function ConfirmDialog() {
  const styles = useStyles();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  const [value] = useLinkedState(confirmationModal);

  useEffect(() => {
    if (value.status === "open") {
      dialogRef.current?.showModal();
      okRef.current?.focus();
    } else {
      dialogRef.current?.close();
    }
  }, [value]);

  const onSubmit = () => {
    confirmationModal.set({ status: "closed", value: "yes" });
  };

  const onNo = () => {
    confirmationModal.set({ status: "closed", value: "no" });
  };

  const onCancel = () => {
    confirmationModal.set({ status: "closed", value: "cancel" });
  };

  return ReactDOM.createPortal(
    <dialog
      className={styles.dialog}
      ref={dialogRef}
      open={false}
      onClose={() => {
        // sync state, to closed. Happens when user hits ESC for example
        if (value.status === "open") {
          confirmationModal.set({ status: "closed", value: "cancel" });
        }
      }}
    >
      {value.status === "closed" ? null : (
        <>
          <span className={styles.message}>{value.message}</span>
          <div className={styles.buttons}>
            {value.cancelString && (
              <button className={styles.button} style={{ marginRight: 32 }} onClick={onCancel}>
                {value.cancelString}
              </button>
            )}
            <button className={styles.button} onClick={onNo}>
              {value.noString ?? "Cancel"}
            </button>
            <button className={styles.button} ref={okRef} onClick={onSubmit} autoFocus={true}>
              {value.okString ?? "OK"}
            </button>
          </div>
        </>
      )}
    </dialog>,
    nullthrows(document.querySelector("#confirm-dialogs")),
  );
}

const useStyles = createUseStyles({
  dialog: {
    fontWeight: 600,
    // borderRadius: 8,
    // border: "none",
    padding: 0,
    "&[open]": {
      display: "flex",
      flexDirection: "column",
    },
  },
  message: {
    padding: "32px 24px 24px 24px",
  },
  buttons: {
    userSelect: "none",
    borderTop: "1px solid #eee",
    padding: "12px 24px 12px 24px",
    gap: 16,
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  button: {
    minWidth: 60,
    fontWeight: 600,
    "&:focus": {
      outline: "5px auto -webkit-focus-ring-color",
    },
  },
});
