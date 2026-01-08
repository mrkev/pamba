import { useContainer, usePrimitive } from "structured-state";
import { AudioProject } from "../lib/project/AudioProject";
import { TimelineT } from "../lib/project/TimelineT";
import { cn } from "../utils/cn";

export function TimelineLine({
  project,
  pos,
  color,
  adjust = 0,
}: {
  project: AudioProject;
  pos: TimelineT;
  color: string;
  adjust?: number;
}) {
  const linePos = useContainer(pos);

  // just to listen to it
  // todo: a way to subscribe to any viewport change?
  usePrimitive(project.viewport.pxPerSecond);
  const [viewportStartPx] = usePrimitive(project.viewport.scrollLeftPx);

  // some lines look better with a little adjustmet of -1 pixel, especially the end loop marker
  const left = linePos.px(project) + viewportStartPx + adjust;

  return (
    <div
      className="absolute top-0 h-full select-none pointer-events-none"
      style={{
        borderLeft: `1px solid ${color}`,
        left,
      }}
    />
  );
}

export function TimelineCursor({ project, isHeader }: { project: AudioProject; isHeader?: boolean }) {
  const [cursorPos] = usePrimitive(project.cursorPos);
  const [selectionWidthRaw] = usePrimitive(project.selectionWidth);
  const selectionWidth = selectionWidthRaw == null ? 0 : selectionWidthRaw;
  if (isHeader) {
    const left =
      selectionWidth >= 0
        ? project.viewport.secsToPx(cursorPos)
        : project.viewport.secsToPx(cursorPos + selectionWidth);
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
            left={left + Math.floor(project.viewport.secsToPx(Math.abs(selectionWidth)))}
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
      className={cn(
        "absolute top-0 h-full select-none pointer-events-none border-l border-l-cursor",
        selectionWidth !== 0 && "border-r border-r-cursor",
      )}
      style={{
        left:
          selectionWidth >= 0
            ? project.viewport.secsToPx(cursorPos)
            : project.viewport.secsToPx(cursorPos + selectionWidth),
        width: selectionWidth === 0 ? 0 : Math.floor(project.viewport.secsToPx(Math.abs(selectionWidth)) - 1),
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
