import classNames from "classnames";
import { useLinkAsState } from "marked-subbable";
import { useRef } from "react";
import { usePrimitive } from "structured-state";
import { useAxisContainerMouseEvents } from "../input/useProjectMouseEvents";
import { AudioProject } from "../lib/project/AudioProject";
import { Axis } from "./axis/Axis";
import { CursorSelection } from "./CursorSelection";
import { LoopMarkers } from "./LoopMarkers";

export function HeaderAxisView({
  project,
  className,
  style,
}: {
  project: AudioProject;
  className?: string;
  style?: React.CSSProperties;
}) {
  const axisContainerRef = useRef<HTMLDivElement | null>(null);
  const [activePanel] = useLinkAsState(project.activePanel);
  const [viewportStartPx] = usePrimitive(project.viewport.scrollLeftPx);

  useAxisContainerMouseEvents(project, axisContainerRef);

  return (
    <div
      ref={axisContainerRef}
      className={classNames(
        "name-axis-container",
        "zoom_cursor",
        "sticky top-0 left-0 border-b border-b-axis-timeline-separator justify-evenly",
        activePanel === "primary" ? "bg-panel-active-background" : "bg-timeline-bg",
        className,
      )}
      style={style}
    >
      {/* Header axis doesn't move, we move the svg inside */}
      <Axis
        //
        viewportStartPx={viewportStartPx}
        project={project}
        className="w-full h-full"
        isHeader
      />
      <LoopMarkers project={project} />
      <CursorSelection track={null} project={project} />
    </div>
  );
}
