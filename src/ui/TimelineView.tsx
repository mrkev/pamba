import React, { useEffect, useRef, useState } from "react";
import { CLIP_HEIGHT, TRACK_HEADER_WIDTH } from "../globals";
import { useAppProjectMouseEvents } from "../input/useAppProjectMouseEvents";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { AudioProject } from "../lib/AudioProject";
import { AudioRenderer } from "../lib/AudioRenderer";
import { useDerivedState } from "../lib/state/DerivedState";
import { useLinkedArray } from "../lib/state/LinkedArray";
import { useLinkedSet } from "../lib/state/LinkedSet";
import { useLinkedState } from "../lib/state/LinkedState";
import { Axis } from "./Axis";
import { Track } from "./Track";
import TrackHeader, { styles } from "./TrackHeader";
import { css } from "@linaria/core";

// 150 is TRACK_HEADER_WIDTH
const containerStyle = css`
  display: grid;
  grid-template-columns: 1fr 150px;
  grid-template-rows: 30px 1fr;
  grid-column-gap: 0px;
  grid-row-gap: 0px;
`;

const styles2 = {
  axisSpacer: {
    height: "30px",
    display: "flex",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-evenly",
    // borderBottom: "1px solid gray",
  } as const,
};

function TimelineCursor({ project }: { project: AudioProject }) {
  const secsToPx = useDerivedState(project.secsToPx);
  const [cursorPos] = useLinkedState(project.cursorPos);
  const [selectionWidth] = useLinkedState(project.selectionWidth);
  return (
    <div
      // ref={cursorPosDiv}
      style={{
        backdropFilter: "invert(100%)",
        height: "100%",
        position: "absolute",
        userSelect: "none",
        pointerEvents: "none",
        left:
          selectionWidth == null || selectionWidth >= 0 ? secsToPx(cursorPos) : secsToPx(cursorPos + selectionWidth),
        width: selectionWidth == null || selectionWidth === 0 ? 1 : secsToPx(Math.abs(selectionWidth)),
        top: 0,
      }}
    ></div>
  );
}

export function TimelineView({
  project,
  player,
  renderer,
}: {
  project: AudioProject;
  player: AnalizedPlayer;
  renderer: AudioRenderer;
}) {
  const playbackPosDiv = useRef<null | HTMLDivElement>(null);
  const [projectDiv, setProjectDiv] = useState<null | HTMLDivElement>(null);
  const [tracks] = useLinkedArray(project.allTracks);
  const [scaleFactor, setScaleFactor] = useLinkedState(project.scaleFactor);
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
      // console.log("wheel", e);
      if (e.ctrlKey) {
        const sDelta = Math.exp(-e.deltaY / 100);
        const newScale = scaleFactor * Math.exp(-e.deltaY / 100);
        setScaleFactor(newScale);
        const widthUpToMouse = (e as any).layerX as number;
        const deltaX = widthUpToMouse - widthUpToMouse * sDelta;
        const newStart = viewportStartPx - deltaX;
        console.log("deltaX", deltaX, "sDelta", sDelta);
        setViewportStartPx(newStart);

        // setScaleFactor((prev) => {
        //   const s = Math.exp(-e.deltaY / 100);
        //   return prev * s;
        // });
        // setViewportStartPx((prev) => {});
        e.preventDefault();
      } else {
        // const pxToSecs = secsToPx.invert;
        // const viewportWidthSecs = pxToSecs(projectDiv.clientWidth);

        // const div = projectDiv;
        const start = Math.max(viewportStartPx + e.deltaX, 0);
        setViewportStartPx(start);
        // div.scrollBy(e.deltaX, e.deltaY);

        // e.preventDefault();
        // e.preventDefault();
        // // we just allow the div to scroll, no need to do it ourselves
        // // // natural scrolling direction (vs inverted)
        // const natural = true;
        // var direction = natural ? -1 : 1;
        // tx += e.deltaX * direction;
        // // ty += e.deltaY * direction;
        // projectDiv.scrollTo({ left: -tx });
        // console.log("SCROLL", tx);
      }

      // console.log(tx, ty, scale);
    };

    const onScroll = (e: Event) => {
      e.preventDefault();
    };

    projectDiv.addEventListener("wheel", onWheel, { capture: false });
    projectDiv.addEventListener("scroll", onScroll, { capture: false });
    return () => {
      projectDiv.removeEventListener("wheel", onWheel, { capture: false });
      projectDiv.addEventListener("scroll", onScroll, { capture: false });
    };
  }, [projectDiv, scaleFactor, setScaleFactor, setViewportStartPx, viewportStartPx]);

  return (
    <div
      id="container"
      className={containerStyle}
      style={{
        width: "100%",
        // display: "flex",
        // flexDirection: "row",
        flexGrow: 1,
      }}
    >
      {/* 1. Track header overhang (bounce button) */}
      <div style={styles2.axisSpacer}>
        {"↑"}
        <BounceButton project={project} renderer={renderer} />
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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: TRACK_HEADER_WIDTH,
          flexShrink: 0,
        }}
      >
        {tracks.map((track, i) => {
          return <TrackHeader key={i} track={track} project={project} player={player} />;
        })}
        <div>
          <button
            onClick={() => {
              AudioProject.addTrack(project, player);
            }}
          >
            new track
          </button>
          <input
            type="range"
            min={Math.log(1)}
            max={Math.log(100)}
            step={0.01}
            value={Math.log(scaleFactor)}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setScaleFactor(Math.exp(val));
            }}
          />
        </div>
      </div>
    </div>
  );
}

function BounceButton({ project, renderer }: { project: AudioProject; renderer: AudioRenderer }) {
  const [selectionWidth] = useLinkedState(project.selectionWidth);
  return (
    <button
      className={styles.utilityButton}
      onClick={() => {
        AudioRenderer.bounceSelection(renderer, project);
      }}
    >
      {selectionWidth && selectionWidth > 0 ? "bounce selected" : "bounce all"}
    </button>
  );
}
