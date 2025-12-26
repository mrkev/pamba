import { useRef, useCallback } from "react";
import { usePrimitive, useContainer } from "structured-state";
import { TOTAL_VERTICAL_NOTES } from "../../constants";
import { AudioProject } from "../../lib/project/AudioProject";
import { MidiClip } from "../../midi/MidiClip";
import { PPQN } from "../../wam/miditrackwam/MIDIConfiguration";
import { useDrawOnCanvas } from "../useDrawOnCanvas";
import { CANVAS_SCALE } from "./MidiClipEditor";
import { keyboardColorOfNote, NOTES } from "./VerticalPianoRollKeys";

export function MidiEditorGridBackground({ clip, project }: { clip: MidiClip; project: AudioProject }) {
  const backgroundRef = useRef<HTMLCanvasElement>(null);
  const [noteHeight] = usePrimitive(clip.detailedViewport.pxNoteHeight);
  const timelineLen = useContainer(clip.timelineLength);
  const [pxPerPulse] = usePrimitive(clip.detailedViewport.pxPerPulse);

  useDrawOnCanvas(
    backgroundRef,
    useCallback(
      (ctx, canvas) => {
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
          const x = pxPerPulse * i + 0.5;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }

        ctx.scale(1, 1);
      },
      [timelineLen, noteHeight, project, pxPerPulse],
    ),
  );

  return (
    <canvas
      ref={backgroundRef}
      height={CANVAS_SCALE * noteHeight * TOTAL_VERTICAL_NOTES}
      width={CANVAS_SCALE * clip.detailedViewport.pulsesToPx(timelineLen.pulses(project))}
      className="pointer-events-none absolute top-0 left-0 bg-timeline-bg"
      style={{
        height: noteHeight * TOTAL_VERTICAL_NOTES,
        width: clip.detailedViewport.pulsesToPx(timelineLen.pulses(project)),
        imageRendering: "pixelated",
      }}
    />
  );
}
