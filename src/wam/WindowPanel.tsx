import React, { useCallback, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import { useEventListener } from "../ui/useEventListener";
import { exhaustive } from "../utils/exhaustive";

type Position = [x: number, y: number];

export function WindowPanel({ children }: { children?: React.ReactNode }) {
  const classes = useStyles();
  const [position, setPosition] = useState<Position>([10, 10]);
  const [cursor, setCursor] = useState<{ status: "idle" } | { status: "moving"; start: Position }>({
    status: "idle",
  });
  const titleBarRef = useRef<HTMLDivElement>(null);

  useEventListener(
    "mousedown",
    titleBarRef,
    useCallback(
      (e: MouseEvent) => {
        console.log("FO");
        setCursor({
          status: "moving",
          start: [e.clientX - position[0], e.clientY - position[1]],
        });
      },
      [position]
    )
  );

  useEventListener(
    "mouseup",
    document,
    useCallback(() => {
      console.log("FaaO");
      setCursor({ status: "idle" });
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
            setPosition([e.clientX - cursor.start[0], e.clientY - cursor.start[1]]);
            break;
          default:
            exhaustive(cursor);
        }
      },
      [cursor]
    )
  );

  return (
    <div className={classes.window} style={{ left: position[0], top: position[1] }}>
      <div className={classes.titleBar} ref={titleBarRef}>
        <button>x</button>
        <div className={classes.spacer} />
        <button>foo</button>
      </div>
      <div className={classes.content}>{children}</div>
    </div>
  );
}

const useStyles = createUseStyles({
  window: {
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
  },
  content: {
    background: "white",
  },
});
