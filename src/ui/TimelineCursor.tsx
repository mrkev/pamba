import { AudioProject } from "../lib/project/AudioProject";
import { useDerivedState } from "../lib/state/DerivedState";
import { useLinkedState } from "../lib/state/LinkedState";

export function TimelineCursor({ project }: { project: AudioProject }) {
  const secsToPx = useDerivedState(project.secsToPx);
  const [cursorPos] = useLinkedState(project.cursorPos);
  const [selectionWidthRaw] = useLinkedState(project.selectionWidth);
  const selectionWidth = selectionWidthRaw == null ? 0 : selectionWidthRaw;
  return (
    <div
      style={{
        borderLeft: "1px solid green",
        borderRight: selectionWidth === 0 ? undefined : "1px solid green",
        height: "100%",
        position: "absolute",
        userSelect: "none",
        pointerEvents: "none",
        left: selectionWidth >= 0 ? secsToPx(cursorPos) : secsToPx(cursorPos + selectionWidth),
        width: selectionWidth === 0 ? 0 : Math.floor(secsToPx(Math.abs(selectionWidth)) - 1),
        top: 0,
      }}
    />
  );
}
