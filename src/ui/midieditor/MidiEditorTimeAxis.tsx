import useResizeObserver from "@react-hook/resize-observer";
import { useRef, useState } from "react";
import { useContainer, usePrimitive } from "structured-state";
import { AudioProject } from "../../lib/project/AudioProject";
import { MidiClip } from "../../midi/MidiClip";
import { cn } from "../../utils/cn";
import { PPQN } from "../../wam/miditrackwam/MIDIConfiguration";
import { getBeatScaleFactorForOneBeatSize } from "../axis/getBeatTickData";

const AXIS_HEIGHT = 18;

/**
 * Time ruler for the MIDI clip editor, aligned with the note grid. Shows bar / beat
 * numbers. Like `MidiEditorGridBackground`, it draws in the same horizontal space
 * (`pulse * pxPerPulse - scrollLeftPx`), and only the ticks within the visible window
 * are rendered so it stays cheap when zoomed in on a long clip.
 */
export function MidiEditorTimeAxis({
  clip,
  project,
  className,
  style,
}: {
  clip: MidiClip;
  project: AudioProject;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [pxPerPulse] = usePrimitive(clip.detailedViewport.pxPerPulse);
  const [scrollLeftPx] = usePrimitive(clip.detailedViewport.scrollLeftPx);
  const [timeSignature] = usePrimitive(project.timeSignature);
  const timelineLen = useContainer(clip.timelineLength);

  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useResizeObserver(ref, (entry) => setWidth(entry.contentRect.width));

  const beatsPerBar = timeSignature[0];

  // Zoom-aware tick step: fewer ticks as beats get narrower. Reuses the timeline's
  // heuristic (in beats), converted to pulses.
  const oneBeatSizePx = PPQN * pxPerPulse;
  const stepPulses = getBeatScaleFactorForOneBeatSize(oneBeatSizePx) * PPQN;

  // Only render ticks in the visible window (with one extra on each side so labels
  // slide in/out gradually rather than popping).
  const endPulse = Math.min((scrollLeftPx + width) / pxPerPulse, timelineLen.pulses(project));
  const firstIdx = Math.max(0, Math.floor(scrollLeftPx / pxPerPulse / stepPulses));
  const lastIdx = Math.ceil(endPulse / stepPulses);

  const ticks: number[] = [];
  for (let idx = firstIdx; idx <= lastIdx; idx++) {
    ticks.push(idx * stepPulses);
  }

  return (
    <div
      ref={ref}
      className={cn("relative overflow-hidden bg-timeline-bg", className)}
      style={{ height: AXIS_HEIGHT, ...style }}
    >
      <svg width={width} height={AXIS_HEIGHT} className="block pointer-events-none select-none">
        {ticks.map((pulse) => {
          const x = pulse * pxPerPulse - scrollLeftPx;
          const beatNum = pulse / PPQN;
          const beatInBar = beatNum % beatsPerBar;
          const isBar = beatInBar === 0;
          // bar.beat, matching the timeline's tempo axis: beat offset is 0-indexed
          // past the bar start (e.g. "2", "2.1", "2.2", "2.3", "3").
          const bar = Math.floor(beatNum / beatsPerBar) + 1;
          const label = isBar ? `${bar}` : `${bar}.${beatInBar}`;
          return (
            <g className="tick" key={pulse}>
              <line
                x1={x}
                x2={x}
                y1={isBar ? 0 : AXIS_HEIGHT * 0.5}
                y2={AXIS_HEIGHT}
                stroke="var(--timeline-tick)"
              />
              <text
                x={x}
                y={AXIS_HEIGHT}
                dx="2px"
                dy="-4px"
                fontSize={isBar ? "9px" : "8px"}
                fill="var(--timeline-text)"
                textAnchor="start"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
