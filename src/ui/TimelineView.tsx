import classNames from "classnames";
import { useRef } from "react";
import { createUseStyles } from "react-jss";
import { usePrimitive } from "structured-state";
import { useAxisContainerMouseEvents } from "../input/useProjectMouseEvents";
import { AnalizedPlayer } from "../lib/io/AnalizedPlayer";
import { AudioRenderer } from "../lib/io/AudioRenderer";
import { AudioProject } from "../lib/project/AudioProject";
import { useLinkedState } from "../lib/state/LinkedState";
import { Axis } from "./Axis";
import { CursorSelection } from "./CursorSelection";
import { LoopMarkers } from "./LoopMarkers";
import { ProjectView } from "./ProjectView";
import { TrackHeaderContainer } from "./TrackHeaderContainer";

export function TimelineView({
  project,
  player,
  renderer,
}: {
  project: AudioProject;
  player: AnalizedPlayer;
  renderer: AudioRenderer;
}) {
  const classes = useStyles();
  const axisContainerRef = useRef<HTMLDivElement | null>(null);
  const [viewportStartPx] = usePrimitive(project.viewport.viewportStartPx);
  const [activePanel] = useLinkedState(project.activePanel);

  useAxisContainerMouseEvents(project, axisContainerRef);

  return (
    <div
      id="container"
      onMouseDownCapture={() => project.activePanel.set("primary")}
      className={classNames(classes.container, "scrollbar-track")}
    >
      <div
        ref={axisContainerRef}
        className={classes.axisContainer}
        style={{
          borderTop: activePanel === "primary" ? "4px solid var(--timeline-text)" : "4px solid var(--timeline-tick)",
        }}
      >
        <Axis project={project} isHeader />
        <LoopMarkers project={project} />
        <CursorSelection track={null} project={project} leftOffset={-viewportStartPx} />
        {/* <TimelineCursor project={project} isHeader /> */}
      </div>
      {/* 1. Track header overhang (bounce button) */}
      <div
        className={classes.axisSpacer}
        style={
          {
            // background: activePanel === "primary" ? "var(--timeline-text)" : undefined,
          }
        }
      >
        {/* <button
          style={{ position: "absolute", left: "4px" }}
          onClick={() => {
            AudioProject.addAudioTrack(project, player);
          }}
          title="Add new track"
        >
          +
        </button> */}
        {/* <UtilityMenu
          style={{ position: "absolute", left: "4px" }}
          label={"+"}
          items={{
            "audio track": () => documentCommands.execById("createAudioTrack", project),
            "midi track": () => documentCommands.execById("createMidiTrack", project),
          }}
        /> */}
        {"↑"}
      </div>

      {/* 2. Project */}
      <ProjectView project={project} renderer={renderer} />

      {/* 3. Track headers */}
      <TrackHeaderContainer project={project} player={player} />
    </div>
  );
}

// Grid example, can I replicate this?
// https://codepen.io/neoky/pen/mGpaKN
const useStyles = createUseStyles({
  container: {
    display: "grid",
    gridTemplateRows: "30px 1fr",
    // 150 is TRACK_HEADER_WIDTH
    gridTemplateColumns: "1fr 150px",
    gridColumnGap: 0,
    gridRowGap: 0,
    overflowY: "scroll",
    overflowX: "hidden",
    height: "100%",
    width: "100%",
    flexGrow: 1,
    borderTopLeftRadius: "3px",
    borderBottomLeftRadius: "3px",
    // paddingRight: "4px",
    marginRight: 1,
    paddingRight: 4,
    msOverflowY: "scroll",
    // border: "3px solid black",
  },
  axisSpacer: {
    backgroundColor: "var(--background)",
    height: "29px",
    display: "flex",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-evenly",
    // borderBottom: "1px solid var(--axis-spacer-headers-separator)",
    position: "sticky",
    top: 0,
    zIndex: 2,
  },
  axisContainer: {
    position: "sticky",
    top: 0,
    left: 0,
    zIndex: 2,
    background: "var(--timeline-bg)",
    borderBottom: "1px solid var(--axis-timeline-separator)",
  },
});
