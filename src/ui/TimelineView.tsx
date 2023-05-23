import { useEffect, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import { CLIP_HEIGHT, TRACK_HEADER_WIDTH } from "../constants";
import { useAppProjectMouseEvents } from "../input/useAppProjectMouseEvents";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { AudioProject } from "../lib/AudioProject";
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
  },
  axisSpacer: {
    height: "30px",
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
  const [projectDiv, setProjectDiv] = useState<null | HTMLDivElement>(null);
  const [tracks] = useLinkedArray(project.allTracks);
  const [scaleFactor] = useLinkedState(project.scaleFactor);
  const [dspExpandedTracks] = useLinkedSet(project.dspExpandedTracks);
  const secsToPx = useDerivedState(project.secsToPx);
  const [viewportStartPx, setViewportStartPx] = useLinkedState(project.viewportStartPx);

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
        setViewportStartPx(newStart);
        e.preventDefault();
      }
      // pan
      else {
        const start = Math.max(viewportStartPx + e.deltaX, 0);
        // console.log("here");
        setViewportStartPx(start);
      }
    };

    const onScroll = (e: Event) => {
      setViewportStartPx((e.target as any).scrollLeft);
      e.preventDefault();
    };

    projectDiv.addEventListener("wheel", onWheel, { capture: false });
    projectDiv.addEventListener("scroll", onScroll, { capture: false });
    return () => {
      projectDiv.removeEventListener("wheel", onWheel, { capture: false });
      projectDiv.removeEventListener("scroll", onScroll, { capture: false });
    };
  }, [project.scaleFactor, projectDiv, setViewportStartPx, viewportStartPx]);

  return (
    <div
      id="container"
      className={classes.container}
      // className={containerStyle}
      style={{
        width: "100%",
        // display: "flex",
        // flexDirection: "row",
        flexGrow: 1,
      }}
    >
      {/* 1. Track header overhang (bounce button) */}
      <div className={classes.axisSpacer}>
        <button
          style={{ position: "absolute", left: "4px" }}
          onClick={() => {
            AudioProject.addTrack(project, player);
          }}
        >
          +
        </button>
        {"↑"}
      </div>

      {/* 2. Project, including track headers */}
      {/* The whole width of this div is 90s */}
      <div
        id="projectDiv"
        ref={(elem) => setProjectDiv(elem)}
        style={{
          position: "relative",
          background: "#ddd",
          paddingBottom: CLIP_HEIGHT,
          overflowX: "scroll",
          overflowY: "hidden",
          width: "100%",
          gridArea: "1 / 1 / 3 / 2",
        }}
      >
        <Axis project={project}></Axis>
        {tracks.map(function (track, i) {
          const isDspExpanded = dspExpandedTracks.has(track);
          return <Track key={i} track={track} project={project} isDspExpanded={isDspExpanded} renderer={renderer} />;
        })}
        <TimelineCursor project={project} />
        <div
          ref={playbackPosDiv}
          style={{
            background: "red",
            width: "1px",
            height: "100%",
            position: "absolute",
            left: 0,
            top: 0,
          }}
        ></div>
      </div>

      {/* 3. Track headers */}
      <div className={classes.trackHeaders}>
        {tracks.map((track, i) => {
          return <TrackHeader key={i} track={track} project={project} player={player} />;
        })}
        <div>
          <input
            type="range"
            min={Math.log(2)}
            max={Math.log(100)}
            step={0.01}
            value={Math.log(scaleFactor)}
            onChange={(e) => {
              if (!projectDiv) {
                return;
              }
              const newFactor = Math.exp(parseFloat(e.target.value));

              const renderedWidth = projectDiv.clientWidth;
              const renderedTime = project.viewport.pxToSecs(projectDiv.clientWidth);
              const newRenderedWidth = project.viewport.secsToPx(renderedTime, newFactor);

              console.log("new", newRenderedWidth, "old", renderedWidth);
              const pxDelta = newRenderedWidth - renderedWidth;
              console.log("PXDELTA", pxDelta);

              // console.log(currentFactor, newFactor, currentFactor - newFactor);
              // const totalPixels = projectDiv.clientWidth * (currentFactor - newFactor);
              // console.log(projectDiv.clientWidth, "totalPixels", totalPixels);
              // const viewportEndPx = viewportStartPx + projectDiv.clientWidth;
              // const middlePx = (viewportStartPx + viewportEndPx) / 2;

              project.scaleFactor.set(newFactor);
              project.viewportStartPx.setDyn((prev) => prev + pxDelta / 2);
            }}
          />
        </div>
      </div>
    </div>
  );
}
