import React, { useState } from "react";
import { createUseStyles } from "react-jss";
import { AudioProject, ProjectMarkers } from "../lib/project/AudioProject";
import { useDerivedState } from "../lib/state/DerivedState";
import { useLinkedMap } from "../lib/state/LinkedMap";
import { useLinkedState } from "../lib/state/LinkedState";
import { cx } from "./cx";

const formatter = new Intl.NumberFormat("en-US", {
  useGrouping: false,
  minimumIntegerDigits: 2,
});

function formatSecs(secs: number) {
  return `${formatter.format(Math.floor(secs / 60))}:${formatter.format(secs % 60)}`;
}

const MIN_TICK_DISTANCE = 60; // 60px

function getStepForRes(dist: number): number {
  switch (true) {
    case dist < 1:
      return 1;
    case dist < 3:
      return 3;
    case dist < 5:
      return 5;
    case dist < 10:
      return 10;
    case dist < 30:
      return 30;
    default:
      return 60;
  }
}

const useStyles = createUseStyles({
  svgContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  },
  markerContainer: {
    height: 29,
    // borderBottom: "1px solid #BBB",
    userSelect: "none",
    position: "absolute",
    top: 0,
    width: "100%",
    cursor: "pointer",
  },
});

export function Axis({ project, isHeader = false }: { project: AudioProject; isHeader?: boolean }) {
  const styles = useStyles();
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);
  const [markers] = useLinkedMap(project.timeMarkers);
  const [viewportStartPx] = useLinkedState(project.viewportStartPx);
  const secsToPx = useDerivedState(project.secsToPx);
  const pxToSecs = secsToPx.invert;

  // const timeForPx = useDerivedState(project.secsToViewportPx);
  // const pxForTime = timeForPx.invert;

  function pxForTime(s: number): number {
    return secsToPx(s) - viewportStartPx;
  }

  function timeForPx(s: number): number {
    return pxToSecs(s + viewportStartPx);
  }

  function getTickData() {
    if (!svg) {
      return null;
    }

    const viewportStartSecs = pxToSecs(viewportStartPx);
    const viewportEndSecs = timeForPx(svg.clientWidth);
    // console.log("viewportEndSecs", viewportEndSecs);

    const MIN_DIST_BEETWEEN_TICKS_SEC = pxToSecs(MIN_TICK_DISTANCE);
    const STEP_SECS = getStepForRes(MIN_DIST_BEETWEEN_TICKS_SEC);

    const ticksToShow: Array<number> = [];

    const shaveOff = viewportStartSecs % STEP_SECS;

    // (viewportStartSecs - shaveOff) gives us a time before the start of our viewport.
    // we do want to render this one though, so that it doesn't just disappear as soon
    // as part of it is out of view, and it does appear like we're scrolling it gradually
    const startingTickSecs = viewportStartSecs - shaveOff;

    for (let s = startingTickSecs; s < viewportEndSecs; s += STEP_SECS) {
      ticksToShow.push(s);
    }

    // console.log("viewing from", viewportStartSecs, "to", endTime);

    // console.log({ viewportStartSecs, totalTime: endTime, startingTickSecs });

    return ticksToShow;
  }

  const tickData = getTickData();

  return (
    <>
      {/* Background grid */}
      <svg
        ref={(elem: SVGSVGElement) => setSvg(elem)}
        className={styles.svgContainer}
        style={{
          left: !isHeader ? viewportStartPx : 0,
          pointerEvents: "none",
          // position: "sticky",
        }}
      >
        {tickData?.map((secs) => {
          const px = pxForTime(secs);
          return (
            <g className="tick" key={secs}>
              <line x1={px} x2={px} y1="0" y2="100%" stroke="#CBCBCB"></line>
              {isHeader && (
                <text
                  x={px}
                  y="2"
                  dx="2px"
                  fontSize="12px"
                  fill="#454545"
                  textAnchor="start"
                  alignmentBaseline="hanging"
                >
                  {formatSecs(secs)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {/* Spacer to make the project content not overlap with the timestamps. Needs to not
      be position: absolute so it interacts with the page flow */}
      {isHeader && <div style={{ height: 30, position: "relative" }} />}
      {isHeader && (
        <div
          className={cx("marker-interaction-area", styles.markerContainer)}
          style={{
            left: viewportStartPx,
          }}
          onDoubleClick={(e: React.MouseEvent) => {
            if ((e.target as any).className !== "marker-interaction-area") {
              return;
            }
            AudioProject.addMarkerAtTime(project, timeForPx(e.nativeEvent.offsetX));
          }}
        >
          {markers
            .map((time, id) => {
              return [
                time,
                <div
                  key={id}
                  style={{
                    position: "absolute",
                    left: pxForTime(time),
                    background: "white",
                    bottom: 0,
                    borderLeft: "1px solid black",
                    paddingRight: 20,
                  }}
                >
                  <Marker
                    onClick={() => {
                      ProjectMarkers.selectMarker(project, id);
                    }}
                    style={{
                      position: "relative",
                      left: -9,
                      bottom: -3,
                      cursor: "pointer",
                    }}
                  />
                  marker {id}
                </div>,
              ] as const;
            })
            .sort(([a], [b]) => a - b)
            .map(([, elem]) => elem)}
        </div>
      )}
    </>
  );
}

function Marker({ style, onClick }: { style?: React.CSSProperties; onClick?: () => void }) {
  return (
    <svg viewBox="0 0 17 10" width="17" height="10" style={style} onClick={onClick}>
      <path
        d="M 8.5 0 L 17 10 L 0 10 L 8.5 0 Z"
        style={{
          fill: "rgb(0, 0, 0)",
        }}
      ></path>
    </svg>
  );
}

/**
 * TODO:
 * - Scale is currently anchored on 0:00. Anchor it on the cursor position
 * - Scale with trackpad, anchored on cursor position
 * - Click and drag on axis moves, zooms, like ableton
 * - If a control is focused, need to click twice to set cursor. Fix that.
 * - Clip properties panel.
 * - Format seconds on canvas view
 * - Disable clip addition during playback, or adding a clip stops playback first.
 * - Markers, play from marker
 * - Comments on markers, for collaboration?
 * - Loop markers, enable/disable loop capturing
 * - Select within single track
 * - Keyboard shortcuts: cut, paste, copy
 * - Command palette, a-la VS Code. Cmd+P
 * - BUG: trimming a clip draws the whole waveform, not a subset
 */
