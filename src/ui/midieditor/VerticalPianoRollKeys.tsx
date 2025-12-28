import { useCallback, useRef } from "react";
import { useContainer, usePrimitive } from "structured-state";
import { TOTAL_VERTICAL_NOTES } from "../../constants";
import { MidiClip } from "../../midi/MidiClip";
import { MidiTrack } from "../../midi/MidiTrack";
import { useDrawOnCanvas } from "../useDrawOnCanvas";
import { useMousePressMove } from "../useEventListener";
import { CANVAS_SCALE, PIANO_ROLL_WIDTH } from "./MidiClipEditor";

type NoteStr = "C" | "C#" | "D" | "D#" | "E" | "F" | "F#" | "G" | "G#" | "A" | "A#" | "B";
export const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

export function keyboardColorOfNote(noteStr: NoteStr, playing: boolean): "black" | "white" | "orange" {
  if (playing) {
    return "orange";
  }
  return noteStr.length === 2 ? "black" : "white";
}

export function VerticalPianoRollKeys({ clip, track }: { clip: MidiClip; track: MidiTrack }) {
  const keysCanvasRef = useRef<HTMLCanvasElement>(null);
  const [noteHeight] = usePrimitive(clip.detailedViewport.pxNoteHeight);
  const playingNotes = useContainer(track.pianoRoll.playingNotes);

  const noteAtY = useCallback(
    (y: number): number => {
      const note = TOTAL_VERTICAL_NOTES - Math.floor(y / noteHeight + 1);
      return note;
    },
    [noteHeight],
  );

  // Piano Roll click plays note
  useMousePressMove(
    keysCanvasRef,
    useCallback(
      function mousedown(e) {
        const note = noteAtY(e.offsetY);
        track.noteOn(note);
        return { note };
      },
      [noteAtY, track],
    ),
    useCallback(
      function mouse(meta, e) {
        switch (meta.event) {
          case "mousemove": {
            {
              if (e.target !== keysCanvasRef.current) {
                return;
              }

              const newNote = noteAtY(e.offsetY);
              if (newNote != meta.mousedown.note) {
                track.noteOff(meta.mousedown.note);
                meta.mousedown.note = newNote;
                track.noteOn(meta.mousedown.note);
              }
              break;
            }
          }
          case "mouseenter": {
            const note = noteAtY(e.offsetY);
            meta.mousedown.note = note;
            track.noteOn(meta.mousedown.note);
            break;
          }

          case "mouseup":
          case "mouseleave": {
            console.log("leave");
            track.allNotesOff();
          }
        }
      },
      [noteAtY, track],
    ),
  );

  const playingNotesHash = playingNotes._hash;
  useDrawOnCanvas(
    keysCanvasRef,
    useCallback(
      (ctx, canvas) => {
        ctx.scale(CANVAS_SCALE, CANVAS_SCALE);
        ctx.strokeStyle = "#bbb";
        // piano roll notes are PPQN / 4 wide
        for (let n = 0; n < TOTAL_VERTICAL_NOTES; n++) {
          const noteStr = NOTES[n % NOTES.length];
          ctx.fillStyle = keyboardColorOfNote(noteStr, playingNotes.has(TOTAL_VERTICAL_NOTES - n - 1));
          void playingNotesHash;
          ctx.fillRect(0, n * noteHeight, PIANO_ROLL_WIDTH, noteHeight);

          // https://stackoverflow.com/questions/13879322/drawing-a-1px-thick-line-in-canvas-creates-a-2px-thick-line
          ctx.beginPath();
          ctx.moveTo(0, n * noteHeight + 0.5);
          ctx.lineTo(canvas.width, n * noteHeight + 0.5);
          ctx.stroke();
        }

        ctx.scale(1, 1);
      },
      // we need the hash to update when playing notes updates
      [noteHeight, playingNotes, playingNotesHash],
    ),
  );

  return (
    <canvas
      ref={keysCanvasRef}
      height={CANVAS_SCALE * noteHeight * TOTAL_VERTICAL_NOTES}
      width={CANVAS_SCALE * PIANO_ROLL_WIDTH}
      className="sticky left-0 bg-timeline-bg"
      style={{
        // pointerEvents: "none",
        height: noteHeight * TOTAL_VERTICAL_NOTES,
        width: PIANO_ROLL_WIDTH,
        zIndex: 1,
      }}
    />
  );
}
