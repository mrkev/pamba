import { MIN_TICK_DISTANCE } from "./getBeatTickData";

// "Nice" tick steps in seconds. Extends the timeline's set (getTimeStepForRes) with
// sub-second steps, since a clip's waveform is often inspected below one second.
const TIME_STEPS = [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 3, 5, 10, 30, 60] as const;

/** Smallest nice step whose on-screen width is at least MIN_TICK_DISTANCE px. */
function niceTimeStep(minDistSecs: number): number {
  for (const step of TIME_STEPS) {
    if (minDistSecs <= step) {
      return step;
    }
  }
  return TIME_STEPS[TIME_STEPS.length - 1];
}

function formatTick(secs: number, step: number): string {
  const decimals = step < 0.1 ? 2 : step < 1 ? 1 : 0;
  return `${secs.toFixed(decimals)}s`;
}

// Amplitude gridlines from +1 (top) to -1 (bottom).
const AMP_TICKS = [1, 0.5, 0, -0.5, -1] as const;

/**
 * Overlay axes for the audio clip buffer view: X is time (seconds into the buffer),
 * Y is amplitude from -1 to 1. Only the ticks within the visible window are rendered
 * (like the timeline `Axis`), so this stays cheap when zoomed in and scrolled.
 */
export function AudioClipBufferAxis({
  width,
  height,
  pxPerSec,
  startSec,
}: {
  width: number;
  height: number;
  pxPerSec: number;
  // Time in seconds at the left edge of the view (accounts for scroll / locked playback).
  startSec: number;
}) {
  if (width <= 0 || height <= 0 || pxPerSec <= 0) {
    return null;
  }

  const step = niceTimeStep(MIN_TICK_DISTANCE / pxPerSec);
  const endSec = startSec + width / pxPerSec;

  // Iterate by integer index to avoid floating-point drift across many ticks.
  const firstIdx = Math.ceil(startSec / step);
  const lastIdx = Math.floor(endSec / step);
  const timeTicks: number[] = [];
  for (let idx = firstIdx; idx <= lastIdx; idx++) {
    timeTicks.push(idx * step);
  }

  const ampToY = (amp: number) => ((1 - amp) / 2) * height;

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none select-none"
      width={width}
      height={height}
    >
      {/* Y axis: amplitude gridlines */}
      {AMP_TICKS.map((amp) => {
        const y = ampToY(amp);
        const isZero = amp === 0;
        return (
          <g className="tick" key={`amp-${amp}`}>
            <line
              x1={0}
              x2={width}
              y1={y}
              y2={y}
              stroke="var(--timeline-tick)"
              strokeOpacity={isZero ? 0.6 : 0.25}
            />
            <text
              x={2}
              y={y}
              dy={amp === 1 ? "0.9em" : amp === -1 ? "-0.4em" : "-0.3em"}
              fontSize="8px"
              fill="var(--timeline-text)"
              textAnchor="start"
            >
              {amp.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* X axis: time ticks */}
      {timeTicks.map((secs) => {
        const px = (secs - startSec) * pxPerSec;
        return (
          <g className="tick" key={`t-${secs}`}>
            <line x1={px} x2={px} y1={0} y2={height} stroke="var(--timeline-tick)" strokeOpacity={0.25} />
            <text
              x={px}
              y={height}
              dx="2px"
              dy="-3px"
              fontSize="8px"
              fill="var(--timeline-text)"
              textAnchor="start"
            >
              {formatTick(secs, step)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
