import { useContainer, usePrimitive } from "structured-state";
import { AudioProject } from "../lib/project/AudioProject";
import { TimelineT } from "../lib/project/TimelineT";
import { cn } from "../utils/cn";

export function TimelineLine({
  project,
  pos,
  color,
  adjust,
}: {
  project: AudioProject;
  pos: TimelineT;
  color: string;
  adjust?: (pos: number) => number;
}) {
  const linePos = useContainer(pos);

  // just to listen to it
  // todo: a way to subscribe to any viewport change?
  usePrimitive(project.viewport.pxPerSecond);

  // some lines look better with a little adjustmet of -1 pixel, especially the end loop marker
  const pospx = project.viewport.timeToPx(linePos);
  const left = adjust ? adjust(pospx) : pospx;

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

export function TimelineCursor({ project }: { project: AudioProject }) {
  const [cursorPos] = usePrimitive(project.cursorPos);
  const [selectionWidthRaw] = usePrimitive(project.selectionWidth);
  const selectionWidth = selectionWidthRaw == null ? 0 : selectionWidthRaw;

  let left = project.viewport.secsToPx(cursorPos);
  let width = project.viewport.secsToPx(Math.abs(selectionWidth));

  if (selectionWidth < 0) {
    left = left - width;
    width = Math.abs(width);
  }

  return (
    <div
      className={cn(
        "box-border",
        "absolute top-0 h-full select-none pointer-events-none border-l border-l-cursor",
        selectionWidth !== 0 && "border-r border-r-cursor",
      )}
      style={{
        left,
        // the +1 is to account for the fact the border is rendered inside the box
        width: width + 1,
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
