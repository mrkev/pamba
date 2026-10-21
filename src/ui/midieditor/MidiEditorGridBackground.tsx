import { useCallback } from "react";
import { useContainer, usePrimitive } from "structured-state";
import { CANVAS_SCALE, TOTAL_VERTICAL_NOTES } from "../../constants";
import { AudioProject } from "../../lib/project/AudioProject";
import { MidiClip } from "../../midi/MidiClip";
import { PPQN } from "../../wam/miditrackwam/MIDIConfiguration";
import { ResponsiveCanvas } from "./ResponsiveCanvas";
import { keyboardColorOfNote, NOTES } from "./VerticalPianoRollKeys";

// Grid line colors, strongest to weakest.
const BAR_LINE_COLOR = "#ccc";
const BEAT_LINE_COLOR = "#999";
const DIVISION_LINE_COLOR = "#777";

// Overlay drawn over the area past the clip's end.
const PAST_CLIP_END_SHADE = "rgba(0, 0, 0, 0.35)";

// Skip grid-resolution lines narrower than this, so zooming out doesn't turn the grid into a smear.
const MIN_DIVISION_LINE_SPACING_PX = 4;

export function MidiEditorGridBackground({ clip, project }: { clip: MidiClip; project: AudioProject }) {
  const [noteHeight] = usePrimitive(clip.detailedViewport.pxNoteHeight);
  const timelineLen = useContainer(clip.timelineLength);
  const [pxPerPulse] = usePrimitive(clip.detailedViewport.pxPerPulse);
  const [scrollLeftPx] = usePrimitive(clip.detailedViewport.scrollLeftPx);
  const [snapDivision] = usePrimitive(project.midi.snapDivision);
  const [timeSignature] = usePrimitive(project.timeSignature);

  const drawFn = useCallback(
    (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      ctx.scale(CANVAS_SCALE, CANVAS_SCALE);

      for (let n = 0; n < TOTAL_VERTICAL_NOTES; n++) {
        const noteStr = NOTES[n % NOTES.length];
        const noteKind = keyboardColorOfNote(noteStr, false);
        const color = noteKind === "black" ? "#555" : "#666";

        // One row per note, shaded like the key it lines up with in `VerticalPianoRollKeys`
        // (same `n * noteHeight` layout, so the two stay aligned).
        ctx.fillStyle = color;
        ctx.fillRect(0, n * noteHeight, canvas.width, noteHeight);
      }

      // Vertical lines at the snap resolution, with beats and bars drawn stronger, so the grid shows
      // where notes will snap to. Falls back to beat lines when the resolution is too dense to see.
      // The canvas spans the visible width, so only lines in [scrollLeftPx, scrollLeftPx + width].
      const pulsesPerBar = PPQN * timeSignature[0];
      const step = snapDivision > 0 && snapDivision * pxPerPulse >= MIN_DIVISION_LINE_SPACING_PX ? snapDivision : PPQN;
      const visibleWidthPx = canvas.width / (window.devicePixelRatio || 1);
      const firstPulse = Math.max(step, Math.ceil(scrollLeftPx / pxPerPulse / step) * step);
      const lastPulse = Math.min(timelineLen.pulses(project), (scrollLeftPx + visibleWidthPx) / pxPerPulse);

      for (let pulse = firstPulse; pulse <= lastPulse; pulse += step) {
        ctx.strokeStyle =
          pulse % pulsesPerBar === 0 ? BAR_LINE_COLOR : pulse % PPQN === 0 ? BEAT_LINE_COLOR : DIVISION_LINE_COLOR;
        const x = Math.round(pxPerPulse * pulse - scrollLeftPx) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Darken everything past the clip's end, so its length is visible in the editor.
      const clipEndX = Math.round(pxPerPulse * timelineLen.pulses(project) - scrollLeftPx);
      if (clipEndX < visibleWidthPx) {
        ctx.fillStyle = PAST_CLIP_END_SHADE;
        ctx.fillRect(Math.max(0, clipEndX), 0, visibleWidthPx - Math.max(0, clipEndX), canvas.height);
      }

      ctx.scale(1, 1);
    },
    [noteHeight, timelineLen, project, pxPerPulse, scrollLeftPx, snapDivision, timeSignature],
  );

  return (
    <ResponsiveCanvas
      className="absolute pointer-events-none bg-timeline-bg"
      drawFn={drawFn}
      style={{
        left: scrollLeftPx,
        // top: 0 bc we render the whole height of notes always
        top: 0,
      }}
      canvasStyle={{ imageRendering: "pixelated" }}
    />
  );
}
