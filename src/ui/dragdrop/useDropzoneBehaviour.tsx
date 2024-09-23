import { RefObject, useCallback, useState } from "react";
import { pressedState } from "../../pressedState";
import { useEventListener } from "../useEventListener";

export function useDropzoneBehaviour(
  containerRef: RefObject<HTMLDivElement>,
  canHandleTransfer: (dataTransfer: DataTransfer | null) => boolean,
  dragOver?: (e: DragEvent) => void,
  dragLeave?: (e: DragEvent) => void,
  drop?: (e: DragEvent) => Promise<void> | void,
) {
  const [draggingOver, setDraggingOver] = useState<false | "transferable" | "invalid">(false);

  useEventListener(
    "dragover",
    containerRef,
    useCallback(
      (e: DragEvent) => {
        // For some reason, need to .preventDefault() so onDrop gets called
        e.preventDefault();
        const dataTransfer = e.dataTransfer;
        if (dataTransfer == null) {
          setDraggingOver("invalid");
          return;
        }

        if (!canHandleTransfer(dataTransfer)) {
          dataTransfer.dropEffect = "none";
          setDraggingOver("invalid");
          return;
        }

        dragOver?.(e);
        setDraggingOver("transferable");
      },
      [canHandleTransfer, dragOver],
    ),
  );

  useEventListener(
    "dragleave",
    containerRef,
    useCallback(
      (e) => {
        setDraggingOver(false);
        dragLeave?.(e);
      },
      [dragLeave],
    ),
  );

  useEventListener(
    "drop",
    containerRef,
    useCallback(
      async (e) => {
        e.preventDefault();
        e.stopPropagation();

        await drop?.(e);
        setDraggingOver(false);
        pressedState.set(null);
      },
      [drop],
    ),
  );

  return [draggingOver];
}
