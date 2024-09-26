import { usePrimitive } from "structured-state";
import { AudioProject } from "../lib/project/AudioProject";
import { useDerivedState } from "../lib/state/DerivedState";

export function TimelineCursor({ project, isHeader }: { project: AudioProject; isHeader?: boolean }) {
  const secsToPx = useDerivedState(project.secsToPx);
  const [cursorPos] = usePrimitive(project.cursorPos);
  const [selectionWidthRaw] = usePrimitive(project.selectionWidth);
  const selectionWidth = selectionWidthRaw == null ? 0 : selectionWidthRaw;
  if (isHeader) {
    const left = selectionWidth >= 0 ? secsToPx(cursorPos) : secsToPx(cursorPos + selectionWidth);
    return (
      <>
        <MarkerTriangle
          size={3}
          left={left}
          color={"green"}
          style={{
            position: "absolute",
            userSelect: "none",
            pointerEvents: "none",
            // width: selectionWidth === 0 ? 0 : Math.floor(secsToPx(Math.abs(selectionWidth)) - 1),
            bottom: 0,
          }}
        />
        {selectionWidth > 0 && (
          <MarkerTriangle
            size={3}
            left={left + Math.floor(secsToPx(Math.abs(selectionWidth)))}
            color={"white"}
            style={{
              position: "absolute",
              userSelect: "none",
              pointerEvents: "none",
              bottom: 0,
            }}
          />
        )}
      </>
    );
  }

  return (
    <div
      style={{
        borderLeft: "1px solid var(--cursor)",
        borderRight: selectionWidth === 0 ? undefined : "1px solid white",
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

export function MarkerTriangle({
  left = 0,
  size = 10,
  style,
  color = "green",
}: {
  style?: React.CSSProperties;
  size: number;
  left: number;
  color: string;
}) {
  return (
    <div
      style={{
        width: "0px",
        height: "0px",
        borderLeft: `${size}px solid transparent`,
        borderRight: `${size}px solid transparent`,
        borderBottom: `${size}px solid ${color}`,
        left: left - size + 0.5,
        ...style,
      }}
    ></div>
  );
}
