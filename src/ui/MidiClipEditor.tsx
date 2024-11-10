import { useCallback, useEffect, useRef } from "react";
import { createUseStyles } from "react-jss";
import { history, useContainer, usePrimitive } from "structured-state";
import { TOTAL_VERTICAL_NOTES } from "../constants";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { AudioProject } from "../lib/project/AudioProject";
import { secsToPulses } from "../lib/project/TimelineT";
import { useLinkedState } from "../lib/state/LinkedState";
import { MidiClip, setClipLength as setMidiClipLength } from "../midi/MidiClip";
import { MidiTrack } from "../midi/MidiTrack";
import { exhaustive } from "../utils/exhaustive";
import { clamp } from "../utils/math";
import { nullthrows } from "../utils/nullthrows";
import { PPQN } from "../wam/pianorollme/MIDIConfiguration";
import { ClipPropsEditor } from "./ClipPropsEditor";
import { NoteR } from "./NoteR";
import { RenamableLabel } from "./RenamableLabel";
import { TimelineTEditor } from "./TimelineTEditor";
import { UtilityToggle } from "./UtilityToggle";
import { useDrawOnCanvas } from "./useDrawOnCanvas";
import { useEventListener } from "./useEventListener";

const DEFAULT_NOTE_DURATION = 6;
const CLIP_TOTAL_BARS = 4;
const CANVAS_SCALE = Math.floor(window.devicePixelRatio);
const PIANO_ROLL_WIDTH = 24;
const MAX_H_SCALE = 20;

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

export function MidiClipEditor({
  clip,
  track,
  player,
  project,
}: {
  clip: MidiClip;
  track: MidiTrack;
  player: AnalizedPlayer;
  project: AudioProject;
}) {
  const styles = useStyles();
  const containerRef = useRef<HTMLDivElement>(null);
  const pianoRollRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const pianoRollCanvasRef = useRef<HTMLCanvasElement>(null);
  const cursorDiv = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLCanvasElement>(null);
  const notes = useContainer(clip.buffer.notes);
  const [name] = usePrimitive(clip.name);
  const [noteHeight, setNoteHeight] = usePrimitive(clip.detailedViewport.pxNoteHeight);
  const [pxPerPulse, setPxPerPulse] = usePrimitive(clip.detailedViewport.pxPerPulse);
  const [secondarySel] = useLinkedState(project.secondarySelection);
  const [panelTool] = usePrimitive(project.panelTool);
  const [bpm] = usePrimitive(project.tempo);
  const timelineLen = useContainer(clip.timelineLength);

  useContainer(clip);

  const secsToPixels = useCallback(
    (secs: number, tempo: number) => {
      // TODO: we shouldn't need tempo for this if we do the math another way
      const ticks = secsToTicks(secs, tempo);
      return clip.detailedViewport.pulsesToPx(ticks);
    },
    [clip.detailedViewport],
  );

  useDrawOnCanvas(
    pianoRollCanvasRef,
    useCallback(
      (ctx, canvas) => {
        ctx.scale(CANVAS_SCALE, CANVAS_SCALE);
        ctx.strokeStyle = "#bbb";
        // piano roll notes are PPQN / 4 wide

        for (let n = 0; n < TOTAL_VERTICAL_NOTES; n++) {
          const noteStr = NOTES[n % NOTES.length];
          ctx.fillStyle = keyboardColorOfNote(noteStr);

          ctx.fillRect(0, n * noteHeight, PIANO_ROLL_WIDTH, noteHeight);

          // https://stackoverflow.com/questions/13879322/drawing-a-1px-thick-line-in-canvas-creates-a-2px-thick-line
          ctx.beginPath();
          ctx.moveTo(0, n * noteHeight + 0.5);
          ctx.lineTo(canvas.width, n * noteHeight + 0.5);
          ctx.stroke();
        }

        ctx.scale(1, 1);
      },
      // TODO: rn need pxPerPulse for updating
      [noteHeight],
    ),
  );

  useDrawOnCanvas(
    backgroundRef,
    useCallback(
      (ctx, canvas) => {
        ctx.scale(CANVAS_SCALE, CANVAS_SCALE);
        ctx.strokeStyle = "#bbb";

        for (let n = 0; n < TOTAL_VERTICAL_NOTES; n++) {
          // const noteStr = NOTES[n % NOTES.length];
          // ctx.fillStyle = keyboardColorOfNote(noteStr);

          // ctx.fillRect(0, n * noteHeight, noteWidth, noteHeight);

          // https://stackoverflow.com/questions/13879322/drawing-a-1px-thick-line-in-canvas-creates-a-2px-thick-line
          ctx.beginPath();
          ctx.moveTo(0, n * noteHeight + 0.5);
          ctx.lineTo(canvas.width, n * noteHeight + 0.5);
          ctx.stroke();
        }

        for (let i = 0; i < clip.lengthPulses; i += PPQN / 4) {
          if (i === 0) {
            continue;
          } else if (i % 8 === 0) {
            ctx.strokeStyle = "#bbb";
          } else {
            ctx.strokeStyle = "#888";
          }
          const x = clip.detailedViewport.pulsesToPx(i) + 0.5;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }

        ctx.scale(1, 1);
      },
      // TODO: rn need pxPerPulse for updating
      [clip.detailedViewport, clip.lengthPulses, noteHeight],
    ),
  );

  useEventListener(
    "wheel",
    pianoRollRef,
    useCallback(
      function (e: WheelEvent) {
        const pianoRoll = nullthrows(pianoRollRef.current);
        const mouseX = e.clientX - pianoRoll.getBoundingClientRect().left;
        e.preventDefault();
        e.stopPropagation();

        // both pinches and two-finger pans trigger the wheel event trackpads.
        // ctrlKey is true for pinches though, so we can use it to differentiate
        // one from the other.
        // pinch
        if (e.ctrlKey) {
          const sDelta = Math.exp(-e.deltaY / 70);
          const expectedNewScale = clip.detailedViewport.pxPerPulse.get() * sDelta;
          // Min: 10 <->  Max: Sample rate
          clip.detailedViewport.setHScale(expectedNewScale, 1, MAX_H_SCALE, mouseX);
        }

        // pan
        else {
          // if (lockPlayback) {
          //   clip.detailedViewport.lockPlayback.set(false);
          //   // TODO: not working, keeping current scroll left position hmm
          //   const offsetFr = offsetFrOfPlaybackPos(player.playbackPos.get());
          //   clip.detailedViewport.scrollLeftPx.set(offsetFr / clip.sampleRate);
          // }
          const maxScrollLeft = pianoRoll.scrollWidth - pianoRoll.clientWidth;
          const maxScrollTop = pianoRoll.scrollHeight - pianoRoll.clientHeight;
          clip.detailedViewport.scrollLeftPx.setDyn((prev) => clamp(0, prev + e.deltaX, maxScrollLeft));
          clip.detailedViewport.scrollTopPx.setDyn((prev) => clamp(0, prev + e.deltaY, maxScrollTop));

          pianoRoll.scrollTo({
            left: clip.detailedViewport.scrollLeftPx.get(),
            top: clip.detailedViewport.scrollTopPx.get(),
          });
        }
      },
      [clip.detailedViewport],
    ),
  );

  // on first render, set the scroll
  useEffect(() => {
    const pianoRoll = nullthrows(pianoRollRef.current);
    pianoRoll.scrollTo({
      left: clip.detailedViewport.scrollLeftPx.get(),
      top: clip.detailedViewport.scrollTopPx.get(),
    });
  }, [clip.detailedViewport.scrollLeftPx, clip.detailedViewport.scrollTopPx]);

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

      cursorElem.style.left = String(secsToPixels(playbackTimeSecs, bpm)) + "px";
      cursorElem.style.display = "block";
    };
  }, [bpm, clip, clip.startOffsetPulses, player, player.isAudioPlaying, secsToPixels]);

  useEventListener(
    "mousedown",
    containerRef,
    useCallback(
      (e: MouseEvent) => {
        const clickedEditor = e.target === containerRef.current;
        if (!clickedEditor) {
          return;
        }
        const TOTAL_HEIGHT = noteHeight * TOTAL_VERTICAL_NOTES;
        const noteNum = Math.floor((TOTAL_HEIGHT - e.offsetY) / noteHeight);

        // default notes  are PPQN / 4 wide
        const DEFAULT_NOTE_WIDTH = clip.detailedViewport.pulsesToPx(PPQN / 4);

        const noteX = Math.floor(e.offsetX / DEFAULT_NOTE_WIDTH);
        const tick = noteX * DEFAULT_NOTE_DURATION;

        const prevNote = clip.findNote(tick, noteNum);
        console.log("prev", prevNote, tick, noteNum);
        const panelTool = project.panelTool.get();
        switch (panelTool) {
          case "move": {
            console.log("HERE", prevNote);
            if (prevNote) {
              // selection handled inside the note
            } else {
              project.secondarySelection.set(null);
            }
            break;
          }
          case "draw": {
            void history.record("draw note", () => {
              if (prevNote != null) {
                // removal handled in note
                // clip.removeNote(prevNote);
              } else {
                MidiClip.addNote(clip, tick, noteNum, DEFAULT_NOTE_DURATION, 100);
              }
            });
            break;
          }
          default:
            exhaustive(panelTool);
        }
      },
      [clip, noteHeight, project.panelTool, project.secondarySelection],
    ),
  );

  return (
    <>
      <ClipPropsEditor clip={clip} project={project} track={track} />
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
        Length {/* TODO: number only */}
        <TimelineTEditor
          t={timelineLen}
          project={project}
          defaultUnit="bars"
          onChange={(t, u) => {
            setMidiClipLength(project, track, clip, t, u);
          }}
        />
        {/* <input
          type="number"
          value={timelineLen.pul}
          step={}
          onChange={(e) => {
            clip.timelineLength.set(parseInt(e.target.value));
          }}
        /> */}
        {/* <UtilityNumber value={1} onChange={console.log} /> */}
        <div>
          <UtilityToggle
            title={"selection tool"}
            toggled={panelTool === "move"}
            onToggle={function (): void {
              project.panelTool.set("move");
            }}
          >
            <i className="ri-cursor-fill"></i>
          </UtilityToggle>
          <UtilityToggle
            title={"draw notes"}
            toggled={panelTool === "draw"}
            onToggle={function (): void {
              project.panelTool.set("draw");
              // unselect notes on changing to draw tool
              if (secondarySel?.status === "notes") {
                project.secondarySelection.set(null);
              }
            }}
          >
            <i className="ri-edit-fill"></i>
          </UtilityToggle>
        </div>
        <input
          type="range"
          min={1}
          max={MAX_H_SCALE}
          step={0.1}
          value={pxPerPulse}
          title="Horizontal Zoom level"
          onChange={(e) => {
            const newVal = parseFloat(e.target.value);
            setPxPerPulse(newVal);
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

      {/*  piano roll notes are PPQN / 4 wide */}

      <div
        ref={pianoRollRef}
        style={{
          display: "grid",
          gridTemplateColumns: `${PIANO_ROLL_WIDTH}px auto`,
          flexGrow: 1,
          overflow: "scroll",
        }}
      >
        <canvas
          ref={pianoRollCanvasRef}
          height={CANVAS_SCALE * noteHeight * TOTAL_VERTICAL_NOTES}
          width={CANVAS_SCALE * PIANO_ROLL_WIDTH}
          style={{
            pointerEvents: "none",
            position: "sticky",
            left: 0,
            height: noteHeight * TOTAL_VERTICAL_NOTES,
            background: "var(--timeline-bg)",
            width: PIANO_ROLL_WIDTH,
            zIndex: 1,
          }}
        />
        <div ref={editorContainerRef} className={styles.editorContainer}>
          <canvas
            ref={backgroundRef}
            height={CANVAS_SCALE * noteHeight * TOTAL_VERTICAL_NOTES}
            width={CANVAS_SCALE * clip.detailedViewport.pulsesToPx(clip.lengthPulses)}
            style={{
              pointerEvents: "none",
              position: "absolute",
              top: 0,
              left: 0,
              height: noteHeight * TOTAL_VERTICAL_NOTES,
              background: "var(--timeline-bg)",
              width: clip.detailedViewport.pulsesToPx(clip.lengthPulses),
              // imageRendering: "pixelated",
            }}
          />
          <div
            className={styles.noteEditor}
            style={{
              height: noteHeight * TOTAL_VERTICAL_NOTES,
            }}
            ref={containerRef}
          >
            <div className={styles.cursor} ref={cursorDiv} />

            {notes.map((note, i) => {
              return <NoteR clip={clip} key={i} note={note} viewport={clip.detailedViewport} project={project} />;
            })}
          </div>
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
    // overflow: "scroll",
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
  noteSelected: {
    background: "green",
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
