import React from "react";
import { AudioProject } from "../lib/AudioProject";
import { useDerivedState } from "../lib/state/DerivedState";
import { useLinkedState } from "../lib/state/LinkedState";

export function TimelineCursor({ project }: { project: AudioProject }) {
  const secsToPx = useDerivedState(project.secsToPx);
  const [cursorPos] = useLinkedState(project.cursorPos);
  const [selectionWidth] = useLinkedState(project.selectionWidth);
  return (
    <div
      style={{
        backdropFilter: "invert(100%)",
        height: "100%",
        position: "absolute",
        userSelect: "none",
        pointerEvents: "none",
        left:
          selectionWidth == null || selectionWidth >= 0 ? secsToPx(cursorPos) : secsToPx(cursorPos + selectionWidth),
        width: selectionWidth == null || selectionWidth === 0 ? 1 : secsToPx(Math.abs(selectionWidth)),
        top: 0,
      }}
    ></div>
  );
}
