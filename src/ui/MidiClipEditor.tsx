import { useCallback, useEffect, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import { history, useContainer, usePrimitive } from "structured-state";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { AudioProject } from "../lib/project/AudioProject";
import { useSubscribeToSubbableMutationHashable } from "../lib/state/LinkedMap";
import { useLinkedState } from "../lib/state/LinkedState";
import { MidiClip, secsToPulses } from "../midi/MidiClip";
import { PPQN } from "../wam/pianorollme/MIDIConfiguration";
import { RenamableLabel } from "./RenamableLabel";
import { UtilityNumber } from "./UtilityNumber";
import { useDrawOnCanvas } from "./useDrawOnCanvas";
import { useEventListener } from "./useEventListener";

const TOTAL_NOTES = 128;

const PULSE_WIDTH = 5;
const NOTE_DURATION = 6;
const NOTE_WDITH = PULSE_WIDTH * NOTE_DURATION;

const CLIP_TOTAL_BARS = 4; //

const CANVAS_SCALE = Math.floor(window.devicePixelRatio);

type NoteStr = "C" | "C#" | "D" | "D#" | "E" | "F" | "F#" | "G" | "G#" | "A" | "A#" | "B";
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

function keyboardColorOfNote(noteStr: NoteStr): "black" | "white" {
  return noteStr.length === 2 ? "black" : "white";
}

function secsToTicks(secs: number, tempo: number) {
  const oneBeatLen = 60 / tempo;
  const oneTickLen = oneBeatLen / PPQN;
  return (secs / oneTickLen) % (CLIP_TOTAL_BARS * PPQN);
}

// TODO: we shouldn't need tempo for this if we do the math another way
function secsToPx(secs: number, tempo: number): number {
  const ticks = secsToTicks(secs, tempo);
  return ticks * PULSE_WIDTH;
}

function pulsesToPx(pulses: number) {
  return pulses * PULSE_WIDTH; //horizontal scale factor
}

export function MidiClipEditor({
  clip,
  player,
  project,
}: {
  clip: MidiClip;
  player: AnalizedPlayer;
  project: AudioProject;
}) {
  const styles = useStyles();
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorDiv = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLCanvasElement>(null);
  const notes = useContainer(clip.notes);
  const [name] = usePrimitive(clip.name);
  const [noteHeight, setNoteHeight] = useState(10 /* px per note */);
  const [pulseWidth, setPulseWidth] = useState(5 /* width of a midi pulse */);
  const [bpm] = useLinkedState(project.tempo);

  useSubscribeToSubbableMutationHashable(clip);

  useDrawOnCanvas(
    backgroundRef,
    useCallback(
      (ctx, canvas) => {
        ctx.scale(CANVAS_SCALE, CANVAS_SCALE);
        ctx.strokeStyle = "#bbb";
        for (let n = 0; n < TOTAL_NOTES; n++) {
          const noteStr = NOTES[n % NOTES.length];
          ctx.fillStyle = keyboardColorOfNote(noteStr);

          ctx.fillRect(0, n * noteHeight, NOTE_WDITH, noteHeight);

          // https://stackoverflow.com/questions/13879322/drawing-a-1px-thick-line-in-canvas-creates-a-2px-thick-line
          ctx.beginPath();
          ctx.moveTo(0, n * noteHeight + 0.5);
          ctx.lineTo(canvas.width, n * noteHeight + 0.5);
          ctx.stroke();
        }
        ctx.scale(1, 1);
      },
      [noteHeight],
    ),
  );

  useEffect(() => {
    player.onFrame2 = function (playbackTimeSecs) {
      const cursorElem = cursorDiv.current;
      if (cursorElem == null) {
        return;
      }

      const playbackTimePulses = secsToPulses(playbackTimeSecs, bpm);
      // before
      if (playbackTimePulses < clip.startOffsetPulses) {
        cursorElem.style.display = "none";
        return;
      }

      // after
      if (playbackTimePulses > clip._timelineEndU) {
        cursorElem.style.display = "none";
        return;
      }

      cursorElem.style.left = String(secsToPx(playbackTimeSecs, bpm)) + "px";
      cursorElem.style.display = "block";
    };
  }, [bpm, clip, clip.startOffsetPulses, player, player.isAudioPlaying]);

  useEventListener(
    "mousedown",
    containerRef,
    useCallback(
      (e: MouseEvent) => {
        const TOTAL_HEIGHT = noteHeight * TOTAL_NOTES;
        const noteNum = Math.floor((TOTAL_HEIGHT - e.offsetY) / noteHeight);

        const noteX = Math.floor(e.offsetX / NOTE_WDITH);
        const tick = noteX * NOTE_DURATION;

        const prevNote = clip.findNote(tick, noteNum);
        void history.record(() => {
          if (prevNote != null) {
            clip.removeNote(prevNote);
          } else {
            clip.addNote(tick, noteNum, NOTE_DURATION, 100);
          }
        });
      },
      [clip, noteHeight],
    ),
  );

  return (
    <>
      <div
        style={{
          border: "3px solid gray",
          borderRadius: "3px",
          display: "flex",
          flexDirection: "column",
          fontSize: 12,
        }}
      >
        <RenamableLabel
          value={name}
          setValue={function (newVal: string): void {
            clip.name.set(newVal);
          }}
        />
        Length <input value={40} onChange={console.log} />
        <UtilityNumber value={1} onChange={console.log} />
        <input
          type="range"
          min={3}
          max={20}
          step={1}
          value={noteHeight}
          title="Horizontal Zoom level"
          onChange={(e) => {
            const newVal = parseFloat(e.target.value);
            setNoteHeight(newVal);
          }}
        />
      </div>

      <input
        // onKeyDown={(e) => e.preventDefault()}
        // onKeyPress={(e) => e.preventDefault()}
        type="range"
        min={3}
        max={20}
        step={1}
        value={noteHeight}
        title="Vertical Zoom Level"
        {...{ orient: "vertical" }}
        onChange={(e) => {
          const newVal = parseFloat(e.target.value);
          setNoteHeight(newVal);
        }}
      />

      <div className={styles.editorContainer} style={{ paddingLeft: NOTE_WDITH }}>
        <canvas
          ref={backgroundRef}
          height={CANVAS_SCALE * noteHeight * TOTAL_NOTES}
          width={CANVAS_SCALE * 512}
          style={{
            pointerEvents: "none",
            position: "absolute",
            top: 0,
            left: 0,
            height: noteHeight * TOTAL_NOTES,
            background: "var(--timeline-bg)",
            width: 512,
            // imageRendering: "pixelated",
          }}
        />
        <div
          className={styles.noteEditor}
          style={{
            height: noteHeight * TOTAL_NOTES,
          }}
          ref={containerRef}
        >
          <div className={styles.cursor} ref={cursorDiv} />

          {notes.map((note, i) => {
            const [tick, num, duration, velocity] = note;
            return (
              <div
                key={i}
                className={styles.note}
                style={{
                  bottom: num * noteHeight - 1,
                  height: noteHeight + 1,
                  left: tick * PULSE_WIDTH,
                  width: pulsesToPx(duration) + 1,
                  overflow: "hidden",
                  opacity: velocity / 100,
                  pointerEvents: "none",
                }}
              ></div>
            );
          })}
        </div>
      </div>
    </>
  );
}

const useStyles = createUseStyles({
  editorContainer: {
    borderRadius: 3,
    position: "relative",
    flexGrow: 1,
    overflow: "scroll",
  },
  noteEditor: {
    position: "relative",
  },
  note: {
    position: "absolute",
    background: "red",
    border: "1px solid #bb0000",
    boxSizing: "border-box",
  },
  cursor: {
    position: "absolute",
    pointerEvents: "none",
    height: "100%",
    top: 0,
    width: "1px",
    background: "red",
    left: 10,
  },
});
