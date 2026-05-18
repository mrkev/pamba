import { useLinkAsState } from "marked-subbable";
import { usePrimitive } from "structured-state";
import { AudioProject, AxisMeasure } from "../../lib/project/AudioProject";
import { standardViewport, StandardViewport } from "../../lib/viewport/StandardViewport";
import { cn } from "../../utils/cn";
import { formatSecs } from "./formatSecs";
import { getBeatTickData, getTimeTickData } from "./getBeatTickData";

export function StandardAxis({
  project,
  viewport,
  isHeader = true,
  primaryAxis,
  style,
  className,
  renderWidth,
}: {
  project: AudioProject;
  viewport: StandardViewport;
  primaryAxis: AxisMeasure;
  renderWidth: number;
  // static: axis is render in place
  // scrolling: container scrolls, bringing axis along
  mode: "static" | "scrolling";
  isHeader?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [activePanel] = useLinkAsState(project.activePanel);
  const [timeSignature] = usePrimitive(project.timeSignature);
  const [viewportStartPx] = usePrimitive(viewport.scrollLeftPx);

  // for updating when changing scale
  usePrimitive(viewport.pxPerSecond);

  const viewportStartSecs = viewport.pxToSecs(viewportStartPx, "pos");
  const viewportEndSecs = viewport.pxToSecs(renderWidth + viewportStartPx, "pos");

  const timeSTicks = getTimeTickData(project, viewportStartSecs, viewportEndSecs);
  const tempoTicks = getBeatTickData(project, viewportStartSecs, viewportEndSecs);

  const textDims = (axis: AxisMeasure) => (primaryAxis === axis ? ["11px", "2"] : ["8px", "70%"]);

  return (
    // Background grid
    <svg
      className={cn("pointer-events-none", className)}
      style={{
        left: viewportStartPx,
        ...style,
      }}
    >
      {primaryAxis === "tempo" &&
        tempoTicks.map(([beatNum, secs]) => {
          const px = standardViewport.secsToViewportPx(viewport, secs, "pos");

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

      {primaryAxis === "time" &&
        timeSTicks.map((secs) => {
          const px = standardViewport.secsToViewportPx(viewport, secs, "pos");
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
