import { useCallback, useEffect, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { useLinkedArray } from "../lib/state/LinkedArray";
import { MidiClip } from "../midi/MidiClip";
import { useEventListener } from "./useEventListener";

const NOTE_HEIGHT = 10;
const TOTAL_NOTES = 128;

const TICK_WIDTH = 5;
const NOTE_DURATION = 6;
const NOTE_WDITH = TICK_WIDTH * NOTE_DURATION;

const CLIP_TOTAL_BARS = 4; //

export const PPQN = 24; // ticks per beat (?)

const TEMPO = 75;

function secsToTicks(secs: number) {
  const oneBeatLen = 60 / TEMPO;
  const oneTickLen = oneBeatLen / PPQN;
  return (secs / oneTickLen) % (CLIP_TOTAL_BARS * PPQN);
}

function secsToPx(secs: number): number {
  const ticks = secsToTicks(secs);
  return ticks * TICK_WIDTH;
}

export function MidiClipEditor({ clip, player }: { clip: MidiClip; player: AnalizedPlayer }) {
  const styles = useStyles();
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorDiv = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef(null);
  const [notes] = useLinkedArray(clip.notes);
  const [, rerender] = useState({});

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

        rerender({});

        // console.log("note", noteNum, tick, clip.hasNote(tick, noteNum));
      },
      [clip],
    ),
  );

  return (
    <div className={styles.container}>
      <div
        className={styles.canvas}
        style={{
          height: NOTE_HEIGHT * TOTAL_NOTES,
          background: "#DDD",
        }}
        ref={containerRef}
      >
        <div className={styles.cursor} ref={cursorDiv} />
        {/* <canvas
          ref={backgroundRef}
          style={{
            pointerEvents: "none",
            position: "absolute",
            top: 0,
            left: 0,
            height: NOTE_HEIGHT * TOTAL_NOTES,
            background: "#DDD",
          }}
        /> */}
        {notes.map((note, i) => {
          const [tick, num, duration, velocity] = note;
          return (
            <div
              key={i}
              className={styles.note}
              style={{
                bottom: num * NOTE_HEIGHT,
                height: NOTE_HEIGHT,
                left: tick * TICK_WIDTH,
                width: NOTE_WDITH,
                overflow: "hidden",
                opacity: velocity / 100,
                pointerEvents: "none",
              }}
            >
              {JSON.stringify(note)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const useStyles = createUseStyles({
  container: {
    borderRadius: 3,
    margin: "0px 4px",
    position: "relative",
    flexGrow: 1,
    overflow: "scroll",
  },
  canvas: {
    position: "relative",
  },
  note: {
    position: "absolute",
    background: "red",
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
