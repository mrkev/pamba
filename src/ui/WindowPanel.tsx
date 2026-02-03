import React, { useCallback, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import { exhaustive } from "../utils/exhaustive";
import { useDocumentEventListener, useEventListener } from "./useEventListener";
import { cn } from "../utils/cn";

export type Position = [x: number, y: number];
export type SetState<S> = React.Dispatch<React.SetStateAction<S>>;

export function WindowPanel({
  children,
  onClose,
  title,
  position,
  onPositionChange,
}: {
  children?: React.ReactNode;
  onClose: () => void;
  title?: string | React.ReactNode;
  position: Position;
  onPositionChange: SetState<Position>;
}) {
  const classes = useStyles();
  const titleBarRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState<{ status: "idle" } | { status: "moving"; start: Position }>({
    status: "idle",
  });

  useEventListener(
    "pointerdown",
    titleBarRef,
    useCallback(
      (e: MouseEvent) => {
        setCursor({
          status: "moving",
          start: [e.clientX - position[0], e.clientY - position[1]],
        });
        e.stopImmediatePropagation();
      },
      [position],
    ),
  );

  useDocumentEventListener(
    "pointerup",
    useCallback((_e: MouseEvent) => {
      setCursor({ status: "idle" });
    }, []),
  );

  useDocumentEventListener(
    "pointermove",
    useCallback(
      (e: MouseEvent) => {
        switch (cursor.status) {
          case "idle":
            break;
          case "moving":
            onPositionChange([e.clientX - cursor.start[0], e.clientY - cursor.start[1]]);
            break;
          default:
            exhaustive(cursor);
        }
      },
      [cursor, onPositionChange],
    ),
  );

  return (
    <div
      className={cn(classes.window, "flex flex-col fixed overflow-hidden select-none")}
      style={{ left: position[0], top: position[1] }}
    >
      <div className={cn(classes.titleBar, "flex flex-row bg-black text-white")} ref={titleBarRef}>
        <button className="utilityButton" onClick={onClose}>
          x
        </button>
        <div className={"grow"} />
        {title}
      </div>
      <div className={"relative bg-white"}>{children}</div>
    </div>
  );
}

const useStyles = createUseStyles({
  window: {
    border: "2px solid black",
    zIndex: 9999,
  },
  titleBar: {
    padding: "0px 4px 0px 0px",
  },
});
