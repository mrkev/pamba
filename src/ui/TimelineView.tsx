import classNames from "classnames";
import { useLinkAsState } from "marked-subbable";
import { useRef } from "react";
import { createUseStyles } from "react-jss";
import { TRACK_HEADER_WIDTH } from "../constants";
import { useAxisContainerMouseEvents } from "../input/useProjectMouseEvents";
import { AudioRenderer } from "../lib/io/AudioRenderer";
import { AudioProject } from "../lib/project/AudioProject";
import { cn } from "../utils/cn";
import { Axis } from "./Axis";
import { CursorSelection } from "./CursorSelection";
import { LoopMarkers } from "./LoopMarkers";
import { ProjectView } from "./ProjectView";
import { TrackHeaderContainer } from "./TrackHeaderContainer";

export function TimelineView({ project, renderer }: { project: AudioProject; renderer: AudioRenderer }) {
  const classes = useStyles();
  const axisContainerRef = useRef<HTMLDivElement | null>(null);
  const [activePanel] = useLinkAsState(project.activePanel);

  useAxisContainerMouseEvents(project, axisContainerRef);

  return (
    <div
      id="container"
      onMouseDownCapture={() => project.activePanel.set("primary")}
      className={classNames(
        classes.container,
        "scrollbar-track",
        "grid overflow-y-scroll overflow-x-hidden h-full w-full grow",
      )}
    >
      <div
        ref={axisContainerRef}
        className={cn(
          "name-axis-container",
          "sticky bg-timeline-bg top-0 left-0 border-b border-b-axis-timeline-separator justify-evenly",
        )}
        style={{
          zIndex: 2,
          borderTop: activePanel === "primary" ? "4px solid var(--timeline-text)" : "4px solid var(--timeline-tick)",
        }}
      >
        <Axis project={project} isHeader />
        <LoopMarkers project={project} />
        <CursorSelection track={null} project={project} />
      </div>
      {/* 1. Track header overhang */}
      <div
        className={cn(
          classes.axisSpacer,
          "sticky top-0 flex items-center flex-row justify-evenly",
          activePanel === "primary" && "bg-panel-active-background",
          activePanel !== "primary" && "bg-background",
        )}
      >
        {"↑"}
      </div>

      {/* 2. Project */}
      <ProjectView project={project} renderer={renderer} />

      {/* 3. Track headers */}
      <TrackHeaderContainer
        className={cn(activePanel === "primary" && "bg-panel-active-background")}
        project={project}
        player={renderer.analizedPlayer}
      />
    </div>
  );
}

// Grid example, can I replicate this?
// https://codepen.io/neoky/pen/mGpaKN
const useStyles = createUseStyles({
  container: {
    gridTemplateRows: "30px 1fr",
    // 150 is TRACK_HEADER_WIDTH
    gridTemplateColumns: "1fr 150px",
    // gridTemplateColumns: "16px 1fr 150px",
    gridColumnGap: 0,
    gridRowGap: 0,
    borderTopLeftRadius: "3px",
    borderBottomLeftRadius: "3px",
    // paddingRight: "4px",
    marginRight: 1,
    paddingRight: 4,
    // border: "3px solid black",
  },
  axisSpacer: {
    height: "29px",
    // borderBottom: "1px solid var(--axis-spacer-headers-separator)",
    width: TRACK_HEADER_WIDTH,
    // we add 10 to cover some empty space to the right. there
    // seems to be some padding to display the scrollbar, but it lets
    // the loop marker show underneath
    borderRight: "10px solid var(--background)",
    zIndex: 2,
  },
});
