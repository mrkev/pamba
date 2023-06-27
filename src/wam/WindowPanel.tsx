import React, { useCallback, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import { useEventListener } from "../ui/useEventListener";
import { exhaustive } from "../utils/exhaustive";

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
  title?: string;
  position: Position;
  onPositionChange: SetState<Position>;
}) {
  const classes = useStyles();
  const [cursor, setCursor] = useState<{ status: "idle" } | { status: "moving"; start: Position }>({
    status: "idle",
  });
  const titleBarRef = useRef<HTMLDivElement>(null);

  useEventListener(
    "mousedown",
    titleBarRef,
    useCallback(
      (e: MouseEvent) => {
        setCursor({
          status: "moving",
          start: [e.clientX - position[0], e.clientY - position[1]],
        });
        e.stopImmediatePropagation();
      },
      [position]
    )
  );

  useEventListener(
    "mouseup",
    document,
    useCallback((_e: MouseEvent) => {
      setCursor({ status: "idle" });
      // e.stopImmediatePropagation();
    }, [])
  );

  useEventListener(
    "mousemove",
    document,
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
        // e.stopImmediatePropagation();
      },
      [cursor, onPositionChange]
    )
  );

  return (
    <div className={classes.window} style={{ left: position[0], top: position[1] }}>
      <div className={classes.titleBar} ref={titleBarRef}>
        <button onClick={onClose}>x</button>
        <div className={classes.spacer} />
        {title}
      </div>
      <div className={classes.content}>{children}</div>
    </div>
  );
}

const useStyles = createUseStyles({
  window: {
    border: "2px solid black",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    zIndex: 9999,
  },
  spacer: {
    flexGrow: 1,
  },
  titleBar: {
    display: "flex",
    flexDirection: "row",
    background: "black",
    color: "white",
    padding: "0px 4px 0px 0px",
  },
  content: {
    background: "white",
  },
});
