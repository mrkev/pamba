import { useRef } from "react";
import { createUseStyles } from "react-jss";
import { useContainer } from "structured-state";
import { TRACK_HEADER_WIDTH } from "../constants";
import { useAxisContainerMouseEvents } from "../input/useProjectMouseEvents";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { AudioRenderer } from "../lib/AudioRenderer";
import { AudioProject } from "../lib/project/AudioProject";
import { useLinkedState } from "../lib/state/LinkedState";
import { Axis } from "./Axis";
import { CursorSelection } from "./CursorSelection";
import { TrackHeader } from "./TrackHeader";
import { UtilityMenu } from "./UtilityMenu";
import { documentCommands } from "../input/useDocumentKeyboardEvents";
import { ProjectView } from "./ProjectView";

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
  const tracks = useContainer(project.allTracks);
  const [viewportStartPx] = useLinkedState(project.viewportStartPx);
  useAxisContainerMouseEvents(project, axisContainerRef);

  return (
    <div id="container" className={classes.container}>
      <div ref={axisContainerRef} className={classes.axisContainer}>
        <Axis project={project} isHeader />
        <CursorSelection track={null} project={project} leftOffset={-viewportStartPx} />
        {/* <TimelineCursor project={project} isHeader /> */}
      </div>
      {/* 1. Track header overhang (bounce button) */}
      <div className={classes.axisSpacer}>
        {/* <button
          style={{ position: "absolute", left: "4px" }}
          onClick={() => {
            AudioProject.addAudioTrack(project, player);
          }}
          title="Add new track"
        >
          +
        </button> */}
        <UtilityMenu
          style={{ position: "absolute", left: "4px" }}
          label={"+"}
          items={{
            "audio track": () => documentCommands.execById("createAudioTrack", project),
            "midi track": () => documentCommands.execById("createMidiTrack", project),
          }}
        />
        {"↑"}
      </div>

      {/* 2. Project */}
      <ProjectView project={project} renderer={renderer} />

      {/* 3. Track headers */}
      <div className={classes.trackHeaders}>
        {tracks.map((track, i) => {
          return (
            <TrackHeader key={i} track={track} project={project} player={player} trackNumber={tracks.length - i} />
          );
        })}
      </div>
    </div>
  );
}

// Grid example, can I replicate this?
// https://codepen.io/neoky/pen/mGpaKN
export const useStyles = createUseStyles({
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
  },
  axisSpacer: {
    backgroundColor: "var(--backgroud)",
    height: "29px",
    display: "flex",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-evenly",
    borderBottom: "1px solid var(--axis-spacer-headers-separator)",
    position: "sticky",
    top: 0,
    zIndex: 2,
  },
  trackHeaders: {
    position: "sticky",
    right: 0,
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    width: TRACK_HEADER_WIDTH,
    flexShrink: 0,
  },
  projectDiv: {
    position: "relative",
    background: "var(--timeline-bg)",
    overflowX: "scroll",
    overflowY: "hidden",
  },
  playbackPosDiv: {
    background: "var(--cursor-playback)",
    width: "1px",
    height: "100%",
    position: "absolute",
    left: 0,
    top: 0,
  },
  axisContainer: {
    position: "sticky",
    top: 0,
    left: 0,
    zIndex: 2,
    borderBottom: "1px solid var(--axis-timeline-separator)",
    background: "var(--timeline-bg)",
  },
});
