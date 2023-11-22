import classNames from "classnames";
import { useState } from "react";
import { createUseStyles } from "react-jss";
import { Position } from "../wam/WindowPanel";

export function UtilityPanelGroup({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  return <div className={styles.panelGroup}></div>;
}

export function UtilityPanel({ children, layout }: { children: React.ReactNode; layout: "horizontal" | "vertical" }) {
  const styles = useStyles();
  const [size, setSize] = useState(100);
  const sizeProp = layout === "horizontal" ? "width" : "height";

  const [cursor, setCursor] = useState<{ status: "idle" } | { status: "resizing"; start: Position }>({
    status: "idle",
  });

  function onMouseDownToResize(e: React.MouseEvent<HTMLDivElement>, from: "start" | "end") {
    e.stopPropagation();
    setCursor({ status: "resizing", start: [e.clientX, e.clientY] });
    document.addEventListener("mouseup", function onMouseUp() {
      setCursor({ status: "idle" });
    });

    // pressedState.set({
    //   status: "resizing_clip",
    //   clip,
    //   // IDEA: just clone and have the original clip at hand
    //   originalClipEndPosSec: clip.trimEndSec,
    //   originalClipStartPosSec: clip.trimStartSec,
    //   originalClipOffsetSec: clip.startOffsetSec,
    //   from,
    //   clientX: e.clientX,
    //   clientY: e.clientY,
    // });
  }

  return (
    <div
      style={{
        [sizeProp]: size,
        position: "relative",
      }}
    >
      <div
        className={classNames(
          layout === "horizontal" && styles.resizerHorizontal,
          layout === "vertical" && styles.resizerVertical,
        )}
        onMouseDown={(e) => onMouseDownToResize(e, "start")}
      ></div>

      {children}
    </div>
  );
}

const useStyles = createUseStyles({
  panelGroup: {
    display: "flex",
  },
  resizerHorizontal: {
    width: 10,
    background: "rgba(0,0,0,1)",
    height: "100%",
    position: "absolute",
    left: -5,
    top: 0,
    cursor: "ew-resize",
  },
  resizerVertical: {
    height: 10,
    background: "rgba(0,0,0,1)",
    width: "100%",
    position: "absolute",
    top: -5,
    left: 0,
    cursor: "ns-resize",
  },
});
