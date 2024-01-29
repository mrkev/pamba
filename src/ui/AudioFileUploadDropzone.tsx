import classNames from "classnames";
import React, { useRef, useState } from "react";
import { AudioProject } from "../lib/project/AudioProject";
import { useLinkedState } from "../lib/state/LinkedState";
import { useEventListener } from "./useEventListener";

export type OptionObj<T extends string, F> = {
  [O in T]: F;
};

export function switchMap<R, T extends string>(opt: T, map: OptionObj<T, () => R>) {
  return map[opt]();
}

function hasFileItem(dataTransfer: DataTransfer | null): dataTransfer is DataTransfer {
  if (!dataTransfer || dataTransfer.items.length < 1) {
    return false;
  }

  for (let i = 0; i < dataTransfer.items.length; i++) {
    const item = dataTransfer.items[i];
    if (item.kind === "file") {
      return true;
    }
  }

  return false;
}

export function AudioFileUploadDropzone({
  children,
  project,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { project: AudioProject; className?: string }) {
  const [status, setStatus] = useState<"idle" | "dragover" | "loading">("idle");
  const divRef = useRef<HTMLDivElement>(null);
  const [audioStorage] = useLinkedState(project.audioStorage);

  useEventListener("dragover", divRef, (e) => {
    if (!audioStorage) {
      return;
    }
    const { dataTransfer } = e;
    if (!hasFileItem(dataTransfer)) {
      return;
    }

    dataTransfer.effectAllowed = "move";
    setStatus("dragover");
  });

  useEventListener("dragover", divRef, (e) => {
    e.preventDefault();
  });

  const onDragExit = async (e: React.DragEvent<HTMLDivElement>) => {
    if (!audioStorage) {
      return;
    }
    const { dataTransfer } = e.nativeEvent;
    if (!dataTransfer) {
      return;
    }
    setStatus("idle");
  };

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!audioStorage) {
      return;
    }

    e.preventDefault();
    const { dataTransfer } = e.nativeEvent;
    if (!dataTransfer) {
      return;
    }

    setStatus("loading");
    for (let i = 0; i < dataTransfer.files.length; i++) {
      const file = dataTransfer.files[i];
      console.log("TODO: VERIFY FILE TYPE. Parallel uploads", file);
      const result = await audioStorage.uploadToLibrary(file);
      if (result instanceof Error) {
        throw result;
      }
    }
    setStatus("idle");
  };

  return (
    <div ref={divRef} className={classNames(className)} onDrop={onDrop} onDragLeave={onDragExit} {...props}>
      {switchMap(status, {
        idle: () => children,
        dragover: () => "drop to upload",
        loading: () => "loading...",
      })}
    </div>
  );
}
