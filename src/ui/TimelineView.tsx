import { useCallback, useEffect, useRef } from "react";
import { createUseStyles } from "react-jss";
import useResizeObserver from "use-resize-observer";
import { TRACK_HEADER_WIDTH } from "../constants";
import { useAxisContainerMouseEvents, useTimelineMouseEvents } from "../input/useProjectMouseEvents";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { AudioRenderer } from "../lib/AudioRenderer";
import { AudioTrack } from "../lib/AudioTrack";
import { AudioProject } from "../lib/project/AudioProject";
import { useDerivedState } from "../lib/state/DerivedState";
import { useLinkedArray } from "../lib/state/LinkedArray";
import { useLinkedSet } from "../lib/state/LinkedSet";
import { useLinkedState } from "../lib/state/LinkedState";
import { MidiTrack } from "../midi/MidiTrack";
import { exhaustive } from "../utils/exhaustive";
import { Axis } from "./Axis";
import { TimelineCursor } from "./TimelineCursor";
import { TrackA } from "./TrackA";
import { TrackHeader } from "./TrackHeader";
import { TrackM } from "./TrackM";
import { useEventListener } from "./useEventListener";

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
  const projectDivRef = useRef<HTMLDivElement | null>(null);
  const axisContainerRef = useRef<HTMLDivElement | null>(null);
  const [tracks] = useLinkedArray(project.allTracks);
  const [dspExpandedTracks] = useLinkedSet(project.dspExpandedTracks);
  const secsToPx = useDerivedState(project.secsToPx);
  const [viewportStartPx] = useLinkedState(project.viewportStartPx);

  useResizeObserver<HTMLDivElement>({
    ref: projectDivRef,
    onResize: useCallback(
      ({ width }: { width?: number; height?: number }) => {
        project.viewport.projectDivWidth.set(width ?? 0);
      },
      [project.viewport.projectDivWidth]
    ),
  });

  useEffect(() => {
    const pbdiv = playbackPosDiv.current;
    if (pbdiv) {
      pbdiv.style.left = String(secsToPx(player.playbackTime)) + "px";
    }
  }, [player, project.viewport, secsToPx]);

  useEffect(() => {
    player.onFrame = function (playbackTime) {
      const pbdiv = playbackPosDiv.current;
      if (pbdiv) {
        pbdiv.style.left = String(secsToPx(playbackTime)) + "px";
      }
    };
  }, [player, project.viewport, secsToPx]);

  useEffect(() => {
    if (!projectDivRef) {
      return;
    }

    projectDivRef.current?.scrollTo({ left: viewportStartPx });
  }, [viewportStartPx]);

  useEventListener(
    "wheel",
    projectDivRef,
    useCallback(
      (e: WheelEvent) => {
        // both pinches and two-finger pans trigger the wheel event trackpads.
        // ctrlKey is true for pinches though, so we can use it to differentiate
        // one from the other.
        // pinch
        if (e.ctrlKey) {
          // console.log("THIS");
          const sDelta = Math.exp(-e.deltaY / 100);
          const expectedNewScale = project.scaleFactor.get() * sDelta;
          project.viewport.setScale(expectedNewScale);
          // // min scale is 0.64, max is 1000
          // const newScale = clamp(0.64, expectedNewScale, 1000);
          // project.scaleFactor.set(newScale);
          // const realSDelta = newScale / project.scaleFactor.get();

          // const widthUpToMouse = e.clientX + viewportStartPx;
          // const deltaX = widthUpToMouse - widthUpToMouse * realSDelta;
          // const newStart = viewportStartPx - deltaX;
          // project.viewportStartPx.set(newStart);
          e.preventDefault();
        }
        // pan
        else {
          const start = Math.max(viewportStartPx + e.deltaX, 0);
          // console.log("here");
          project.viewportStartPx.set(start);
        }
      },
      [project.scaleFactor, project.viewport, project.viewportStartPx, viewportStartPx]
    ),
    { capture: false }
  );

  useEventListener(
    "scroll",
    projectDivRef,
    useCallback(
      (e: Event) => {
        project.viewportStartPx.set((e.target as any).scrollLeft);
        e.preventDefault();
      },
      [project.viewportStartPx]
    )
  );

  useAxisContainerMouseEvents(project, axisContainerRef);
  useTimelineMouseEvents(project, projectDivRef);

  return (
    <div id="container" className={classes.container}>
      <div
        ref={axisContainerRef}
        className={classes.axisContainer}

        // TODO THIS SELECTS GLOBAL TIME
      >
        <Axis project={project} isHeader />
      </div>
      {/* 1. Track header overhang (bounce button) */}
      <div className={classes.axisSpacer}>
        <button
          style={{ position: "absolute", left: "4px" }}
          onClick={() => {
            AudioProject.addAudioTrack(project, player);
          }}
          title="Add new track"
        >
          +
        </button>
        {"↑"}
      </div>

      {/* 2. Project, including track headers */}
      <div id="projectDiv" className={classes.projectDiv} ref={projectDivRef}>
        <Axis project={project}></Axis>
        {/* <div id="bgs" style={{ position: "absolute", width: "100%", left: viewportStartPx, background: "green" }}>
          {tracks.map(function (track, i) {
            return (
              <div
                key={i}
                style={{
                  width: "200px",
                  height: track.height.get(),
                  position: "sticky",
                  left: 0,
                  background: "red",
                }}
              />
            );
          })}
        </div> */}
        {tracks.map((track, i) => {
          const isDspExpanded = dspExpandedTracks.has(track);
          // TODO: Singel track renderer??
          if (track instanceof AudioTrack) {
            return (
              <TrackA
                key={i}
                track={track}
                project={project}
                isDspExpanded={isDspExpanded}
                renderer={renderer}
                style={{ width: viewportStartPx + (projectDivRef.current?.clientWidth ?? 0) }}
              />
            );
          }
          if (track instanceof MidiTrack) {
            return (
              <TrackM
                key={i}
                track={track}
                project={project}
                renderer={renderer}
                isDspExpanded={isDspExpanded}
                style={{ width: viewportStartPx + (projectDivRef.current?.clientWidth ?? 0) }}
              ></TrackM>
            );
          }
          exhaustive(track);
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
  axisContainer: {
    position: "sticky",
    top: 0,
    left: 0,
    zIndex: 2,
    borderBottom: "1px solid #aaa",
    background: "#ddd",
  },
});
