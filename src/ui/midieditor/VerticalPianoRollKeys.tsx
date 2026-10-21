import { useCallback, useRef } from "react";
import { useContainer, usePrimitive } from "structured-state";
import { TOTAL_VERTICAL_NOTES } from "../../constants";
import { MidiClip } from "../../midi/MidiClip";
import { midiTrack, MidiTrack } from "../../midi/MidiTrack";
import { useDrawOnCanvas } from "../useDrawOnCanvas";
import { useMousePressMove } from "../useEventListener";
import { CANVAS_SCALE, VERTICAL_PIANO_WIDTH } from "../../constants";

type NoteStr = "C" | "C#" | "D" | "D#" | "E" | "F" | "F#" | "G" | "G#" | "A" | "A#" | "B";
export const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

/** Pitch name of a MIDI note number (60 -> "C"). */
export function noteStrOfNumber(num: number): NoteStr {
  return NOTES[num % NOTES.length];
}

/** Octave of a MIDI note number, with middle C (60) in octave 4. */
function octaveOfNumber(num: number): number {
  return Math.floor(num / NOTES.length) - 1;
}

// Below this row height there's no room for the "C4" labels on the keys.
const MIN_LABEL_NOTE_HEIGHT = 8;

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
        midiTrack.noteOn(track, note);
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
                midiTrack.noteOff(track, meta.mousedown.note);
                meta.mousedown.note = newNote;
                midiTrack.noteOn(track, meta.mousedown.note);
              }
              break;
            }
          }
          case "mouseenter": {
            const note = noteAtY(e.offsetY);
            meta.mousedown.note = note;
            midiTrack.noteOn(track, meta.mousedown.note);
            break;
          }

          case "mouseup":
          case "mouseleave": {
            midiTrack.allNotesOff(track);
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
          // rows are drawn top-down, starting at the highest note
          const noteNum = TOTAL_VERTICAL_NOTES - n - 1;
          const noteStr = noteStrOfNumber(noteNum);
          ctx.fillStyle = keyboardColorOfNote(noteStr, playingNotes.has(noteNum));
          void playingNotesHash;
          ctx.fillRect(0, n * noteHeight, VERTICAL_PIANO_WIDTH, noteHeight);

          // label every C with its octave (C4 = middle C)
          if (noteStr === "C" && noteHeight >= MIN_LABEL_NOTE_HEIGHT) {
            ctx.fillStyle = "#555";
            ctx.font = `${Math.min(noteHeight - 1, 9)}px sans-serif`;
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            ctx.fillText(`C${octaveOfNumber(noteNum)}`, VERTICAL_PIANO_WIDTH - 2, n * noteHeight + noteHeight / 2);
          }

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
      width={CANVAS_SCALE * VERTICAL_PIANO_WIDTH}
      className="sticky left-0 bg-timeline-bg"
      style={{
        height: noteHeight * TOTAL_VERTICAL_NOTES,
        width: VERTICAL_PIANO_WIDTH,
        zIndex: 1,
      }}
    />
  );
}
