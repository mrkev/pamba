import { useLinkAsState } from "marked-subbable";
import { usePrimitive } from "structured-state";
import { AudioProject, AxisMeasure } from "../../lib/project/AudioProject";
import { cn } from "../../utils/cn";
import { formatSecs } from "./formatSecs";
import { getBeatTickData, getTimeTickData } from "./getBeatTickData";

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
  const [timeSignature] = usePrimitive(project.timeSignature);

  // for updating when changing scale
  usePrimitive(project.viewport.pxPerSecond);

  const viewportStartSecs = project.viewport.pxToSecs(viewportStartPx, "pos");
  const viewportEndSecs = project.viewport.pxToSecs(projectDivWidth + viewportStartPx, "pos");

  const timeSTicks = getTimeTickData(project, viewportStartSecs, viewportEndSecs);
  const tempoTicks = getBeatTickData(project, viewportStartSecs, viewportEndSecs);

  const textDims = (axis: AxisMeasure) => (primaryAxis === axis ? ["11px", "2"] : ["8px", "70%"]);

  return (
    // Background grid
    <svg className={cn("pointer-events-none", className)} style={style}>
      {(isHeader || primaryAxis === "tempo") &&
        tempoTicks.map(([beatNum, secs]) => {
          const px = project.viewport.secsToViewportPx(secs, "pos");

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
          const px = project.viewport.secsToViewportPx(secs, "pos");
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
