import { useCallback, useEffect, useRef } from "react";
import { createUseStyles } from "react-jss";
import { history, useContainer, usePrimitive } from "structured-state";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { AudioProject } from "../lib/project/AudioProject";
import { useSubscribeToSubbableMutationHashable } from "../lib/state/LinkedMap";
import { useLinkedState } from "../lib/state/LinkedState";
import { MidiClip, secsToPulses } from "../midi/MidiClip";
import { exhaustive } from "../utils/exhaustive";
import { PPQN } from "../wam/pianorollme/MIDIConfiguration";
import { MidiViewport } from "./AudioViewport";
import { RenamableLabel } from "./RenamableLabel";
import { UtilityNumber } from "./UtilityNumber";
import { UtilityToggle } from "./UtilityToggle";
import { useDrawOnCanvas } from "./useDrawOnCanvas";
import { useEventListener } from "./useEventListener";
import { nullthrows } from "../utils/nullthrows";
import { clamp } from "../utils/math";
import { NoteR } from "./NoteR";

const TOTAL_VERTICAL_NOTES = 128;
const DEFAULT_NOTE_DURATION = 6;

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
function secsToPx(secs: number, tempo: number, clipViewport: MidiViewport): number {
  const ticks = secsToTicks(secs, tempo);
  return clipViewport.pulsesToPx(ticks);
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
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const cursorDiv = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLCanvasElement>(null);
  const notes = useContainer(clip.notes);
  const [name] = usePrimitive(clip.name);
  const [noteHeight, setNoteHeight] = usePrimitive(clip.detailedViewport.pxNoteHeight);
  const [pxPerPulse, setPxPerPulse] = usePrimitive(clip.detailedViewport.pxPerPulse);
  const [secondarySel] = useLinkedState(project.secondarySelection);
  const [panelTool] = useLinkedState(project.panelTool);
  const [bpm] = useLinkedState(project.tempo);

  useSubscribeToSubbableMutationHashable(clip);

  useDrawOnCanvas(
    backgroundRef,
    useCallback(
      (ctx, canvas) => {
        ctx.scale(CANVAS_SCALE, CANVAS_SCALE);
        ctx.strokeStyle = "#bbb";
        // piano roll notes are PPQN / 4 wide
        const noteWidth = clip.detailedViewport.pulsesToPx(PPQN / 4);

        for (let n = 0; n < TOTAL_VERTICAL_NOTES; n++) {
          const noteStr = NOTES[n % NOTES.length];
          ctx.fillStyle = keyboardColorOfNote(noteStr);

          ctx.fillRect(0, n * noteHeight, noteWidth, noteHeight);

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
          const x = noteWidth + clip.detailedViewport.pulsesToPx(i) + 0.5;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }

        ctx.scale(1, 1);
      },
      // TODO: rn need pxPerPulse for updating
      [clip.detailedViewport, clip.lengthPulses, noteHeight, pxPerPulse],
    ),
  );

  useEventListener(
    "wheel",
    editorContainerRef,
    useCallback(
      function (e: WheelEvent) {
        const editorContainer = nullthrows(editorContainerRef.current);
        const mouseX = e.clientX - editorContainer.getBoundingClientRect().left;
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
          clip.detailedViewport.setHScale(expectedNewScale, 1, 10, mouseX);
        }

        // pan
        else {
          // if (lockPlayback) {
          //   clip.detailedViewport.lockPlayback.set(false);
          //   // TODO: not working, keeping current scroll left position hmm
          //   const offsetFr = offsetFrOfPlaybackPos(player.playbackPos.get());
          //   clip.detailedViewport.scrollLeftPx.set(offsetFr / clip.sampleRate);
          // }
          const maxScrollLeft = editorContainer.scrollWidth - editorContainer.clientWidth;
          const maxScrollTop = editorContainer.scrollHeight - editorContainer.clientHeight;
          clip.detailedViewport.scrollLeftPx.setDyn((prev) => clamp(0, prev + e.deltaX, maxScrollLeft));
          clip.detailedViewport.scrollTopPx.setDyn((prev) => clamp(0, prev + e.deltaY, maxScrollTop));
          // console.log(clip.detailedViewport.scrollLeftPx.get(), clip.detailedViewport.scrollTopPx.get());
          editorContainer.scrollTo({
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
    const editorContainer = nullthrows(editorContainerRef.current);
    editorContainer.scrollTo({
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

      cursorElem.style.left = String(secsToPx(playbackTimeSecs, bpm, clip.detailedViewport)) + "px";
      cursorElem.style.display = "block";
    };
  }, [bpm, clip, clip.startOffsetPulses, player, player.isAudioPlaying]);

  useEventListener(
    "mousedown",
    containerRef,
    useCallback(
      (e: MouseEvent) => {
        const TOTAL_HEIGHT = noteHeight * TOTAL_VERTICAL_NOTES;
        const noteNum = Math.floor((TOTAL_HEIGHT - e.offsetY) / noteHeight);

        // default notes  are PPQN / 4 wide
        const DEFAULT_NOTE_WIDTH = clip.detailedViewport.pulsesToPx(PPQN / 4);

        const noteX = Math.floor(e.offsetX / DEFAULT_NOTE_WIDTH);
        const tick = noteX * DEFAULT_NOTE_DURATION;

        const prevNote = clip.findNote(tick, noteNum);

        const panelTool = project.panelTool.get();
        switch (panelTool) {
          case "move": {
            if (prevNote) {
              project.secondarySelection.set({ status: "notes", notes: new Set([prevNote]) });
            } else {
              project.secondarySelection.set(null);
            }
            break;
          }
          case "draw": {
            void history.record(() => {
              if (prevNote != null) {
                clip.removeNote(prevNote);
              } else {
                clip.addNote(tick, noteNum, DEFAULT_NOTE_DURATION, 100);
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
        <input
          value={clip.lengthPulses}
          onChange={(e) => {
            console.log(parseInt(e.target.value));
          }}
        />
        <UtilityNumber value={1} onChange={console.log} />
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
          max={10}
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
        ref={editorContainerRef}
        className={styles.editorContainer}
        style={{ paddingLeft: clip.detailedViewport.pulsesToPx(PPQN / 4) }}
      >
        <canvas
          ref={backgroundRef}
          height={CANVAS_SCALE * noteHeight * TOTAL_VERTICAL_NOTES}
          // piano roll notes are PPQN / 4 wide
          width={CANVAS_SCALE * clip.detailedViewport.pulsesToPx(clip.lengthPulses + PPQN / 4)}
          style={{
            pointerEvents: "none",
            position: "absolute",
            top: 0,
            left: 0,
            height: noteHeight * TOTAL_VERTICAL_NOTES,
            background: "var(--timeline-bg)",
            // piano roll notes are PPQN / 4 wide
            width: clip.detailedViewport.pulsesToPx(clip.lengthPulses + PPQN / 4),
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
            return <NoteR key={i} note={note} viewport={clip.detailedViewport} project={project} />;
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
