import { useContainer, usePrimitive } from "structured-state";
import { AudioProject } from "../lib/project/AudioProject";
import { TimelineT } from "../lib/project/TimelineT";
import { standardViewport, StandardViewport } from "../lib/viewport/StandardViewport";
import { cn } from "../utils/cn";

export function TimelineLine({
  project,
  pos,
  color,
  adjust,
  className,
  style,
  ...rest
}: React.HTMLProps<HTMLDivElement> & {
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
  const pospx = project.viewport.timeToPx(linePos, "pos");
  const left = adjust ? adjust(pospx) : pospx;

  return (
    <div
      className={cn("absolute top-0 h-full select-none pointer-events-none", className)}
      style={{
        borderLeft: `1px solid ${color}`,
        left,
        ...style,
      }}
      {...rest}
    />
  );
}

/**
 * The cursor's look: a line at `left`, growing a second edge when it spans a selection of
 * `width`. Takes pixels rather than a viewport because the callers don't share one — the
 * timeline measures in seconds (`StandardViewport`) and the MIDI editor in pulses
 * (`MidiViewport`), so only the geometry is common.
 */
export function CursorLine({
  left,
  width = 0,
  className,
  style,
  ...rest
}: React.ComponentProps<"div"> & { left: number; width?: number }) {
  return (
    <div
      className={cn(
        "box-border",
        "absolute top-0 h-full select-none pointer-events-none border-l border-l-cursor",
        width !== 0 && "border-r border-r-cursor",
        className,
      )}
      style={{
        left,
        // the +1 is to account for the fact the border is rendered inside the box
        width: width + 1,
        ...style,
      }}
      {...rest}
    />
  );
}

export function TimelineCursor({
  project,
  viewport,
  style,
}: {
  project: AudioProject;
  viewport: StandardViewport;
  style?: React.CSSProperties;
}) {
  const [cursorPos] = usePrimitive(project.cursorPos);
  const [selectionWidthRaw] = usePrimitive(project.selectionWidth);
  const selectionWidth = selectionWidthRaw == null ? 0 : selectionWidthRaw;

  let left = standardViewport.secsToPx(viewport, cursorPos, "pos");
  let width = standardViewport.secsToPx(viewport, Math.abs(selectionWidth), "len");

  if (selectionWidth < 0) {
    left = left - width;
    width = Math.abs(width);
  }

  return <CursorLine left={left} width={width} style={style} />;
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
