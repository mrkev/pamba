import { useCallback } from "react";
import { useContainer, usePrimitive } from "structured-state";
import { TOTAL_VERTICAL_NOTES } from "../../constants";
import { AudioProject } from "../../lib/project/AudioProject";
import { MidiClip } from "../../midi/MidiClip";
import { PPQN } from "../../wam/miditrackwam/MIDIConfiguration";
import { CANVAS_SCALE } from "../../constants";
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

        // const noteStr = NOTES[n % NOTES.length];
        // ctx.fillStyle = keyboardColorOfNote(noteStr);
        // ctx.fillRect(0, n * noteHeight, noteWidth, noteHeight);
        // https://stackoverflow.com/questions/13879322/drawing-a-1px-thick-line-in-canvas-creates-a-2px-thick-line

        ctx.fillStyle = color;
        ctx.fillRect(0, n * noteHeight + 0.5, canvas.width, n * (noteHeight + 1) + 0.5);
        // ctx.beginPath();
        // ctx.moveTo(0, n * noteHeight + 0.5);
        // ctx.lineTo(canvas.width, n * noteHeight + 0.5);
        // ctx.stroke();
      }

      for (let i = 0; i < timelineLen.pulses(project); i += PPQN / 4) {
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
      canvasStyle={{
        imageRendering: "pixelated",
      }}
    />
  );
}
