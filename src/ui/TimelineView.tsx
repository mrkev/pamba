import { useEffect, useRef } from "react";
import { createUseStyles } from "react-jss";
import { CLIP_HEIGHT, TRACK_HEADER_WIDTH } from "../constants";
import { useAppProjectMouseEvents } from "../input/useAppProjectMouseEvents";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { AudioProject } from "../lib/project/AudioProject";
import { AudioRenderer } from "../lib/AudioRenderer";
import { useDerivedState } from "../lib/state/DerivedState";
import { useLinkedArray } from "../lib/state/LinkedArray";
import { useLinkedSet } from "../lib/state/LinkedSet";
import { useLinkedState } from "../lib/state/LinkedState";
import { clamp } from "../utils/math";
import { Axis } from "./Axis";
import { TimelineCursor } from "./TimelineCursor";
import { Track } from "./Track";
import TrackHeader from "./TrackHeader";

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
  },
  axisSpacer: {
    height: "29px",
    display: "flex",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-evenly",
    borderBottom: "1px solid #eee",
    position: "sticky",
    top: 0,
    zIndex: 2,
    background: "white",
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
    background: "#ddd",
    overflowX: "scroll",
    overflowY: "hidden",
  },
  playbackPosDiv: {
    background: "red",
    width: "1px",
    height: "100%",
    position: "absolute",
    left: 0,
    top: 0,
  },
});

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
  const playbackPosDiv = useRef<null | HTMLDivElement>(null);
  const [projectDiv, setProjectDiv] = useLinkedState<null | HTMLDivElement>(project.projectDiv);
  const [tracks] = useLinkedArray(project.allTracks);
  const [dspExpandedTracks] = useLinkedSet(project.dspExpandedTracks);
  const secsToPx = useDerivedState(project.secsToPx);
  const [viewportStartPx] = useLinkedState(project.viewportStartPx);

  useEffect(() => {
    const pbdiv = playbackPosDiv.current;
    if (pbdiv) {
      pbdiv.style.left = String(secsToPx(player.playbackTime)) + "px";
    }
  }, [player, secsToPx]);

  useEffect(() => {
    player.onFrame = function (playbackTime) {
      const pbdiv = playbackPosDiv.current;
      if (pbdiv) {
        pbdiv.style.left = String(secsToPx(playbackTime)) + "px";
      }
    };
  }, [player, secsToPx]);

  useAppProjectMouseEvents({
    project,
    projectDiv,
  });

  useEffect(() => {
    if (!projectDiv) {
      return;
    }

    projectDiv.scrollTo({ left: viewportStartPx });
  }, [projectDiv, viewportStartPx]);

  useEffect(() => {
    if (!projectDiv) {
      return;
    }

    // var tx = 0;
    // var ty = 0;

    const onWheel = function (e: WheelEvent) {
      // both pinches and two-finger pans trigger the wheel event trackpads.
      // ctrlKey is true for pinches though, so we can use it to differentiate
      // one from the other.
      // pinch
      if (e.ctrlKey) {
        // console.log("THIS");
        const sDelta = Math.exp(-e.deltaY / 100);
        const expectedNewScale = project.scaleFactor.get() * sDelta;
        // min scale is 0.64, max is 1000
        const newScale = clamp(0.64, expectedNewScale, 1000);
        project.scaleFactor.set(newScale);
        const realSDelta = newScale / project.scaleFactor.get();

        const widthUpToMouse = e.clientX + viewportStartPx;
        const deltaX = widthUpToMouse - widthUpToMouse * realSDelta;
        const newStart = viewportStartPx - deltaX;
        project.viewportStartPx.set(newStart);
        e.preventDefault();
      }
      // pan
      else {
        const start = Math.max(viewportStartPx + e.deltaX, 0);
        // console.log("here");
        project.viewportStartPx.set(start);
      }
    };

    const onScroll = (e: Event) => {
      project.viewportStartPx.set((e.target as any).scrollLeft);
      e.preventDefault();
    };

    projectDiv.addEventListener("wheel", onWheel, { capture: false });
    projectDiv.addEventListener("scroll", onScroll, { capture: false });
    return () => {
      projectDiv.removeEventListener("wheel", onWheel, { capture: false });
      projectDiv.removeEventListener("scroll", onScroll, { capture: false });
    };
  }, [project.scaleFactor, project.viewportStartPx, projectDiv, viewportStartPx]);

  return (
    <div id="container" className={classes.container}>
      <div
        style={{
          position: "sticky",
          top: 0,
          left: 0,
          zIndex: 2,
          borderBottom: "1px solid #aaa",
          background: "#ddd",
        }}
      >
        <Axis project={project} isHeader />
      </div>
      {/* 1. Track header overhang (bounce button) */}
      <div className={classes.axisSpacer}>
        <button
          style={{ position: "absolute", left: "4px" }}
          onClick={() => {
            AudioProject.addTrack(project, player);
          }}
          title="Add new track"
        >
          +
        </button>
        {"↑"}
      </div>

      {/* 2. Project, including track headers */}
      {/* The whole width of this div is 90s */}
      <div
        id="projectDiv"
        className={classes.projectDiv}
        ref={(elem) => setProjectDiv(elem)}
        style={{
          paddingBottom: CLIP_HEIGHT,
        }}
      >
        <Axis project={project}></Axis>
        {/* <div id="bgs" style={{ position: "absolute", width: "100%", right: 0 }}>
          {tracks.map(function (track, i) {
            return (
              <div
                key={i}
                style={{
                  width: "200px",
                  height: "30px",
                  position: "sticky",
                  left: 0,
                  background: "red",
                }}
              />
            );
          })}
        </div> */}
        {tracks.map(function (track, i) {
          const isDspExpanded = dspExpandedTracks.has(track);
          return <Track key={i} track={track} project={project} isDspExpanded={isDspExpanded} renderer={renderer} />;
        })}
        <TimelineCursor project={project} />
        <div ref={playbackPosDiv} className={classes.playbackPosDiv}></div>
      </div>

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
