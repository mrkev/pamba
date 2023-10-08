import { useCallback, useEffect, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { useLinkedArray } from "../lib/state/LinkedArray";
import { MidiClip } from "../midi/MidiClip";
import { useEventListener } from "./useEventListener";
import { PPQN } from "../wam/pianorollme/MIDIConfiguration";
import { useSubscribeToSubbableMutationHashable } from "../lib/state/LinkedMap";

const NOTE_HEIGHT = 10;
const TOTAL_NOTES = 128;

const TICK_WIDTH = 5;
const NOTE_DURATION = 6;
const NOTE_WDITH = TICK_WIDTH * NOTE_DURATION;

const CLIP_TOTAL_BARS = 4; //

const TEMPO = 75;

const CANVAS_SCALE = Math.floor(window.devicePixelRatio);

type NoteStr = "C" | "C#" | "D" | "D#" | "E" | "F" | "F#" | "G" | "G#" | "A" | "A#" | "B";
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
function keyboardColorOfNote(noteStr: NoteStr): "black" | "white" {
  return noteStr.length === 2 ? "black" : "white";
}

function secsToTicks(secs: number) {
  const oneBeatLen = 60 / TEMPO;
  const oneTickLen = oneBeatLen / PPQN;
  return (secs / oneTickLen) % (CLIP_TOTAL_BARS * PPQN);
}

function secsToPx(secs: number): number {
  const ticks = secsToTicks(secs);
  return ticks * TICK_WIDTH;
}

function useDrawOnCanvas(
  ref: React.RefObject<HTMLCanvasElement>,
  cb: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void,
) {
  useEffect(() => {
    const elem = ref.current;
    const ctx = elem?.getContext("2d") ?? null;
    if (ctx == null || elem == null) {
      return;
    }

    ctx.save();
    cb(ctx, elem);
    return () => {
      console.log("clearing");
      ctx.clearRect(0, 0, elem.width, elem.height);
      ctx.restore();
    };
  }, [cb, ref]);
}

function pulsesToPx(pulses: number) {
  return pulses * 5; //horizontal scale factor
}

export function MidiClipEditor({ clip, player }: { clip: MidiClip; player: AnalizedPlayer }) {
  const styles = useStyles();
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorDiv = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLCanvasElement>(null);
  const [notes] = useLinkedArray(clip.notes);

  useSubscribeToSubbableMutationHashable(clip);

  useDrawOnCanvas(
    backgroundRef,
    useCallback((ctx, canvas) => {
      console.log("drawing", ctx.getTransform());
      ctx.scale(CANVAS_SCALE, CANVAS_SCALE);
      ctx.strokeStyle = "#bbb";
      for (let n = 0; n < TOTAL_NOTES; n++) {
        const noteStr = NOTES[n % NOTES.length];
        ctx.fillStyle = keyboardColorOfNote(noteStr);

        ctx.fillRect(0, n * NOTE_HEIGHT, NOTE_WDITH, NOTE_HEIGHT);

        // https://stackoverflow.com/questions/13879322/drawing-a-1px-thick-line-in-canvas-creates-a-2px-thick-line
        ctx.beginPath();
        ctx.moveTo(0, n * NOTE_HEIGHT + 0.5);
        ctx.lineTo(canvas.width, n * NOTE_HEIGHT + 0.5);
        ctx.stroke();
      }
      ctx.scale(1, 1);
      console.log("done");
    }, []),
  );

  useEffect(() => {
    player.onFrame2 = function (playbackTimeSecs) {
      const pbdiv = cursorDiv.current;
      if (pbdiv) {
        pbdiv.style.left = String(secsToPx(playbackTimeSecs)) + "px";
      }
    };
  }, [player, player.isAudioPlaying]);

  useEventListener(
    "mousedown",
    containerRef,
    useCallback(
      (e: MouseEvent) => {
        const TOTAL_HEIGHT = NOTE_HEIGHT * TOTAL_NOTES;
        const noteNum = Math.floor((TOTAL_HEIGHT - e.offsetY) / NOTE_HEIGHT);

        const noteX = Math.floor(e.offsetX / NOTE_WDITH);
        const tick = noteX * NOTE_DURATION;

        const prevNote = clip.findNote(tick, noteNum);
        if (prevNote != null) {
          clip.removeNote(prevNote);
        } else {
          clip.addNote(tick, noteNum, NOTE_DURATION, 100);
        }
      },
      [clip],
    ),
  );

  return (
    <div className={styles.container} style={{ paddingLeft: NOTE_WDITH }}>
      <canvas
        ref={backgroundRef}
        height={CANVAS_SCALE * NOTE_HEIGHT * TOTAL_NOTES}
        width={CANVAS_SCALE * 512}
        style={{
          pointerEvents: "none",
          position: "absolute",
          top: 0,
          left: 0,
          height: NOTE_HEIGHT * TOTAL_NOTES,
          background: "#DDD",
          width: 512,
          // imageRendering: "pixelated",
        }}
      />
      <div
        className={styles.noteEditor}
        style={{
          height: NOTE_HEIGHT * TOTAL_NOTES,
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
                bottom: num * NOTE_HEIGHT - 1,
                height: NOTE_HEIGHT + 1,
                left: tick * TICK_WIDTH,
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
  );
}

const useStyles = createUseStyles({
  container: {
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
