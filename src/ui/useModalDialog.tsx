import { useEffect, useRef, useState } from "react";

function useEventListener<K extends keyof HTMLElementEventMap, T extends HTMLElement>(
  type: K,
  ref: React.RefObject<T>,
  listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any
): void {
  useEffect(() => {
    const elem = ref.current;
    if (elem == null) {
      return;
    }

    elem.addEventListener(type, listener);
    return () => {
      elem.removeEventListener(type, listener);
    };
  }, [listener, ref, type]);
}

export function useModalDialog(
  renderForm: () => React.ReactElement
): [React.ReactElement, (cb?: (data: FormData) => void) => void] {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [callback, setCallback] = useState<(data: FormData) => void>(() => {});

  const onSubmit = (e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    e.preventDefault();
    const formData = new FormData(e.target as any);
    callback?.(formData);
    dialogRef.current?.close();
  };

  return [
    <dialog id="favDialog" ref={dialogRef} style={{ padding: 0, userSelect: "none" }} open={false}>
      <form style={{ padding: "1rem", display: "flex", flexDirection: "column" }} ref={formRef} onSubmit={onSubmit}>
        {renderForm()}
      </form>
    </dialog>,
    (cb?: (data: FormData) => void) => {
      if (cb) {
        setCallback(() => cb);
      }
      dialogRef.current?.showModal();
    },
  ];
}
