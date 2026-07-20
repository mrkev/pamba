import { useCallback } from "react";
import { useContainer, usePrimitive } from "structured-state";
import { CANVAS_SCALE, TOTAL_VERTICAL_NOTES } from "../../constants";
import { AudioProject } from "../../lib/project/AudioProject";
import { MidiClip } from "../../midi/MidiClip";
import { PPQN } from "../../wam/miditrackwam/MIDIConfiguration";
import { ResponsiveCanvas } from "./ResponsiveCanvas";
import { keyboardColorOfNote, NOTES } from "./VerticalPianoRollKeys";

// TODO: Virtualize this
export function MidiEditorGridBackground({ clip, project }: { clip: MidiClip; project: AudioProject }) {
  const [noteHeight] = usePrimitive(clip.detailedViewport.pxNoteHeight);
  const timelineLen = useContainer(clip.timelineLength);
  const [pxPerPulse] = usePrimitive(clip.detailedViewport.pxPerPulse);
  const [scrollLeftPx] = usePrimitive(clip.detailedViewport.scrollLeftPx);

  const drawFn = useCallback(
    (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      ctx.scale(CANVAS_SCALE, CANVAS_SCALE);
      ctx.strokeStyle = "#bbb";

      for (let n = 0; n < TOTAL_VERTICAL_NOTES; n++) {
        const noteStr = NOTES[n % NOTES.length];
        const noteKind = keyboardColorOfNote(noteStr, false);
        const color = noteKind === "black" ? "#555" : "#666";

        // One row per note, shaded like the key it lines up with in `VerticalPianoRollKeys`
        // (same `n * noteHeight` layout, so the two stay aligned).
        ctx.fillStyle = color;
        ctx.fillRect(0, n * noteHeight, canvas.width, noteHeight);
      }

      for (let i = 0; i <= timelineLen.pulses(project); i += PPQN / 4) {
        if (i === 0) {
          continue;
        } else if (i % 8 === 0) {
          ctx.strokeStyle = "#bbb";
        } else {
          ctx.strokeStyle = "#888";
        }
        const x = pxPerPulse * i + 0.5 - scrollLeftPx;

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      ctx.scale(1, 1);
    },
    [noteHeight, timelineLen, project, pxPerPulse, scrollLeftPx],
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
