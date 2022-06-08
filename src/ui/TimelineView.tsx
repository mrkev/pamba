import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { Axis } from "./Axis";
import { CLIP_HEIGHT } from "../globals";
import { AudioProject } from "../lib/AudioProject";

import { useDerivedState } from "../lib/state/DerivedState";
import { useLinkedArray } from "../lib/state/LinkedArray";
import { useLinkedSet } from "../lib/state/LinkedSet";
import { useLinkedState } from "../lib/state/LinkedState";
import { Track } from "./Track";
import TrackHeader from "./TrackHeader";
import { useAppProjectMouseEvents } from "../input/useAppProjectMouseEvents";
import { AudioRenderer } from "../lib/AudioRenderer";

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
  const [selected] = useLinkedState(project.selected);
  const [scaleFactor, setScaleFactor] = useLinkedState(project.scaleFactor);
  const [dspExpandedTracks] = useLinkedSet(project.dspExpandedTracks);
  const secsToPx = useDerivedState(project.secsToPx);
  const [cursorPos] = useLinkedState(project.cursorPos);
  const [selectionWidth] = useLinkedState(project.selectionWidth);
  const [viewportStartSecs, setViewportStartSecs] = useLinkedState(project.viewportStartSecs);

  const [, setStateCounter] = useState<number>(0);
  const rerender = useCallback(function () {
    setStateCounter((x) => x + 1);
  }, []);

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
    rerender,
  });

  useEffect(() => {
    if (!projectDiv) {
      return;
    }

    projectDiv.scrollTo({ left: viewportStartSecs });
  }, [projectDiv, viewportStartSecs]);

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
        const newStart = viewportStartSecs - deltaX;
        console.log("deltaX", deltaX, "sDelta", sDelta);
        setViewportStartSecs(newStart);

        // setScaleFactor((prev) => {
        //   const s = Math.exp(-e.deltaY / 100);
        //   return prev * s;
        // });
        // setViewportStartSecs((prev) => {});
        e.preventDefault();
      } else {
        console.log("timeline");
        // const div = projectDiv;
        const start = Math.max(viewportStartSecs + e.deltaX, 0);
        setViewportStartSecs(start);
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
      // console.log(e as any);
      e.preventDefault();
    };

    projectDiv.addEventListener("wheel", onWheel, { capture: false });
    projectDiv.addEventListener("scroll", onScroll, { capture: false });
    return () => {
      projectDiv.removeEventListener("wheel", onWheel, { capture: false });
      projectDiv.addEventListener("scroll", onScroll, { capture: false });
    };
  }, [projectDiv, scaleFactor, setScaleFactor, setViewportStartSecs, viewportStartSecs]);

  return (
    <div
      id="container"
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "row",
      }}
    >
      {/* The whole width of this div is 90s */}
      <div
        id="projectDiv"
        ref={(elem) => setProjectDiv(elem)}
        style={{
          position: "relative",
          background: "#ddd",
          paddingBottom: CLIP_HEIGHT,
          overflowX: "hidden",
          width: "100%",
        }}
      >
        {projectDiv && <Axis project={project} projectDiv={projectDiv}></Axis>}
        {tracks.map(function (track, i) {
          const isDspExpanded = dspExpandedTracks.has(track);
          return <Track key={i} track={track} project={project} isDspExpanded={isDspExpanded} renderer={renderer} />;
        })}
        <div
          // ref={cursorPosDiv}
          style={{
            backdropFilter: "invert(100%)",
            height: "100%",
            position: "absolute",
            userSelect: "none",
            pointerEvents: "none",
            left:
              selectionWidth == null || selectionWidth >= 0
                ? secsToPx(cursorPos)
                : secsToPx(cursorPos + selectionWidth),
            width: selectionWidth == null || selectionWidth === 0 ? 1 : secsToPx(Math.abs(selectionWidth)),
            top: 0,
          }}
        ></div>
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

      {/* Track headers */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "150px",
        }}
      >
        <div
          className="axis-spacer"
          style={{
            height: "30px",
            display: "flex",
            alignItems: "center",
            flexDirection: "row",
          }}
        >
          {/* Spacer for the axis */}

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
        {tracks.map((track, i) => {
          const isSelected = selected !== null && selected.status === "tracks" && selected.test.has(track);
          return <TrackHeader key={i} isSelected={isSelected} track={track} project={project} player={player} />;
        })}
        <div>
          <button
            onClick={() => {
              AudioProject.addTrack(project, player);
            }}
          >
            new track
          </button>
        </div>
      </div>
    </div>
  );
}
