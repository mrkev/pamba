import { usePrimitive } from "structured-state";
import { SECS_IN_MIN } from "../constants";
import { AudioProject, AxisMeasure } from "../lib/project/AudioProject";
import { cn } from "../utils/cn";
import { useLinkAsState } from "marked-subbable";

const formatter = new Intl.NumberFormat("en-US", {
  useGrouping: false,
  minimumIntegerDigits: 2,
});

function formatSecs(secs: number) {
  return `${formatter.format(Math.floor(secs / 60))}:${formatter.format(secs % 60)}`;
}

const MIN_TICK_DISTANCE = 60; // 60px

function getTimeStepForRes(dist: number): number {
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

function getBeatScaleFactorForOneBeatSize(dist: number): number {
  switch (true) {
    case dist < 60 / 16:
      return 16 * 4;
    case dist < 60 / 8:
      return 16;
    case dist < 60 / 4:
      return 4;
    case dist < 40:
      return 2;
    default:
      return 1;
  }
}

export function getOneTickLen(project: AudioProject, tempo: number) {
  const oneBeatLen = SECS_IN_MIN / tempo;
  const oneBeatSizePx = project.viewport.secsToPx(oneBeatLen);
  const tickBeatFactor = getBeatScaleFactorForOneBeatSize(oneBeatSizePx);
  const tickBeatLength = tickBeatFactor * oneBeatLen;
  return tickBeatLength;
}

/**
 * returns an array of seconds at which to show a tick
 * for a viewport that starts at startS px and ends at endS
 */
function getTimeTickData(project: AudioProject, startS: number, endS: number) {
  const viewportStartSecs = startS;
  const viewportEndSecs = endS;

  const MIN_DIST_BEETWEEN_TICKS_SEC = project.viewport.pxToSecs(MIN_TICK_DISTANCE);
  const STEP_SECS = getTimeStepForRes(MIN_DIST_BEETWEEN_TICKS_SEC);

  const shaveOff = viewportStartSecs % STEP_SECS;
  // (viewportStartSecs - shaveOff) gives us a time before the start of our viewport.
  // we do want to render this one though, so that it doesn't just disappear as soon
  // as part of it is out of view, and it does appear like we're scrolling it gradually
  const startingTickSecs = viewportStartSecs - shaveOff;

  const ticksToShow: Array<number> = [];
  for (let s = startingTickSecs; s < viewportEndSecs; s += STEP_SECS) {
    ticksToShow.push(s);
  }
  return ticksToShow;
}

/**
 * returns an array of ticks (beat number, time of beat in seconds)
 * for a viewport that starts at startS px and ends at endS
 */
function getBeatTickData(
  project: AudioProject,
  startS: number,
  endS: number,
  tempo: number,
): (readonly [beatNum: number, time: number])[] {
  const viewportStartSecs = startS;
  const viewportEndSecs = endS;

  const oneBeatLen = SECS_IN_MIN / tempo;
  const oneBeatSizePx = project.viewport.secsToPx(oneBeatLen);
  const tickBeatFactor = getBeatScaleFactorForOneBeatSize(oneBeatSizePx);
  const tickBeatLength = tickBeatFactor * oneBeatLen;

  // Find the first beat after `viewportStartSecs` that fits our tick beat length.
  // NOTE: technically, Math.ceil. But we render one beat before the viewport start
  // so text doesn't just "disappear" when the "beat line" scrolls out of view
  const firstBeatNum = Math.floor(viewportStartSecs / tickBeatLength);

  const ticksToShow = [];
  for (
    let i = firstBeatNum * tickBeatFactor, s = tickBeatLength * firstBeatNum;
    s < viewportEndSecs;
    i += tickBeatFactor, s += tickBeatLength
  ) {
    ticksToShow.push([i, s] as const);
  }
  return ticksToShow;
}

/**
 * Renders a sliding window of ticks
 */
export function Axis({
  project,
  isHeader = false,
  viewportStartPx,
  style,
  className,
}: {
  project: AudioProject;
  viewportStartPx: number;
  isHeader?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [projectDivWidth] = usePrimitive(project.viewport.projectDivWidth);
  const [primaryAxis] = usePrimitive(project.primaryAxis);
  const [activePanel] = useLinkAsState(project.activePanel);

  const [tempo] = usePrimitive(project.tempo);
  const [timeSignature] = usePrimitive(project.timeSignature);

  // for updating when changing scale
  usePrimitive(project.viewport.pxPerSecond);

  const viewportStartSecs = project.viewport.pxToSecs(viewportStartPx);
  const viewportEndSecs = project.viewport.pxToSecs(projectDivWidth + viewportStartPx);

  const timeSTicks = getTimeTickData(project, viewportStartSecs, viewportEndSecs);
  const tempoTicks = getBeatTickData(project, viewportStartSecs, viewportEndSecs, tempo);

  const textDims = (axis: AxisMeasure) => (primaryAxis === axis ? ["11px", "2"] : ["8px", "70%"]);

  return (
    // Background grid
    <svg className={cn("pointer-events-none", className)} style={style}>
      {(isHeader || primaryAxis === "tempo") &&
        tempoTicks.map(([beatNum, secs]) => {
          const px = project.viewport.secsToViewportPx(secs);
          const denom = beatNum % timeSignature[0];
          const label = `${Math.floor(beatNum / 4) + 1}` + (denom === 0 ? "" : `.${denom}`);
          const [fontSize, textY] = textDims("tempo");

          return (
            <g className="tick" key={secs}>
              <line
                x1={px}
                x2={px}
                y1={primaryAxis === "time" ? "70%" : "0"}
                y2="100%"
                stroke="var(--timeline-tick)"
              ></line>
              {isHeader && (
                <text
                  x={px}
                  y={textY}
                  dx="2px"
                  fontSize={fontSize}
                  fill={activePanel === "primary" ? "var(--timeline-text)" : "var(--timeline-text-inactive)"}
                  textAnchor="start"
                  alignmentBaseline="hanging"
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}
      {(isHeader || primaryAxis === "time") &&
        timeSTicks.map((secs) => {
          const px = project.viewport.secsToViewportPx(secs);
          const [fontSize, textY] = textDims("time");
          return (
            <g className="tick" key={secs}>
              <line
                x1={px}
                x2={px}
                y1={primaryAxis === "time" ? "0" : "70%"}
                y2="100%"
                stroke="var(--timeline-tick)"
              ></line>
              {isHeader && (
                <text
                  x={px}
                  y={textY}
                  dx="2px"
                  fontSize={fontSize}
                  fill={activePanel === "primary" ? "var(--timeline-text)" : "var(--timeline-text-inactive)"}
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
  );
}

// function Marker({ style, onClick }: { style?: React.CSSProperties; onClick?: () => void }) {
//   return (
//     <svg viewBox="0 0 17 10" width="17" height="10" style={style} onClick={onClick}>
//       <path
//         d="M 8.5 0 L 17 10 L 0 10 L 8.5 0 Z"
//         style={{
//           fill: "rgb(0, 0, 0)",
//         }}
//       ></path>
//     </svg>
//   );
// }

/**
 * TODO:
 * DONE Scale is currently anchored on 0:00. Anchor it on the cursor position
 * DONE Scale with trackpad, anchored on cursor position
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
