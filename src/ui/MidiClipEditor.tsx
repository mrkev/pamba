import { useLinkAsState } from "marked-subbable";
import { useCallback, useEffect, useRef } from "react";
import { history, useContainer, usePrimitive } from "structured-state";
import { TOTAL_VERTICAL_NOTES } from "../constants";
import { AnalizedPlayer } from "../lib/io/AnalizedPlayer";
import { AudioProject } from "../lib/project/AudioProject";
import { secsToPulses } from "../lib/project/TimelineT";
import { MidiClip } from "../midi/MidiClip";
import { MidiTrack } from "../midi/MidiTrack";
import { cn } from "../utils/cn";
import { exhaustive } from "../utils/exhaustive";
import { clamp } from "../utils/math";
import { nullthrows } from "../utils/nullthrows";
import { PPQN } from "../wam/miditrackwam/MIDIConfiguration";
import { ClipPropsEditor } from "./ClipPropsEditor";
import { NoteR } from "./NoteR";
import { UtilityToggle } from "./UtilityToggle";
import { useDrawOnCanvas } from "./useDrawOnCanvas";
import { useEventListener, useMousePressMove } from "./useEventListener";

const DEFAULT_NOTE_DURATION = 6;
const CLIP_TOTAL_BARS = 4;
const CANVAS_SCALE = Math.floor(window.devicePixelRatio);
const PIANO_ROLL_WIDTH = 24;
const MAX_H_SCALE = 20;

type NoteStr = "C" | "C#" | "D" | "D#" | "E" | "F" | "F#" | "G" | "G#" | "A" | "A#" | "B";
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

function keyboardColorOfNote(noteStr: NoteStr, playing: boolean): "black" | "white" | "orange" {
  if (playing) {
    return "orange";
  }
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
  const containerRef = useRef<HTMLDivElement>(null);
  const pianoRollRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const pianoRollCanvasRef = useRef<HTMLCanvasElement>(null);
  const cursorDiv = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLCanvasElement>(null);
  const notes = useContainer(clip.buffer.notes);
  const [noteHeight, setNoteHeight] = usePrimitive(clip.detailedViewport.pxNoteHeight);
  const [pxPerPulse, setPxPerPulse] = usePrimitive(clip.detailedViewport.pxPerPulse);
  const [secondarySel] = useLinkAsState(project.secondarySelection);
  const [panelTool] = usePrimitive(project.panelTool);
  const [bpm] = usePrimitive(project.tempo);
  const timelineLen = useContainer(clip.timelineLength);
  const playingNotes = useContainer(track.pianoRoll.playingNotes);

  const noteAtY = useCallback(
    (y: number): number => {
      const note = TOTAL_VERTICAL_NOTES - Math.floor(y / noteHeight + 1);
      return note;
    },
    [noteHeight],
  );

  const secsToPixels = useCallback(
    (secs: number, tempo: number) => {
      // TODO: we shouldn't need tempo for this if we do the math another way
      const ticks = secsToTicks(secs, tempo);
      return clip.detailedViewport.pulsesToPx(ticks);
    },
    [clip.detailedViewport],
  );

  // Piano Roll click plays note
  useMousePressMove(
    pianoRollCanvasRef,
    useCallback(
      function mousedown(e) {
        const note = noteAtY(e.offsetY);
        track.noteOn(note);
        playingNotes.add(note);
        return { note };
      },
      [noteAtY, playingNotes, track],
    ),
    useCallback(
      function mouse(meta, e) {
        switch (meta.event) {
          case "mousemove": {
            {
              if (e.target !== pianoRollCanvasRef.current) {
                return;
              }

              const newNote = noteAtY(e.offsetY);
              if (newNote != meta.mousedown.note) {
                track.noteOff(meta.mousedown.note);
                playingNotes.delete(meta.mousedown.note);
                meta.mousedown.note = newNote;
                track.noteOn(meta.mousedown.note);
                playingNotes.add(meta.mousedown.note);
              }
              break;
            }
          }
          case "mouseenter": {
            const note = noteAtY(e.offsetY);
            meta.mousedown.note = note;
            track.noteOn(meta.mousedown.note);
            playingNotes.add(meta.mousedown.note);
            break;
          }

          case "mouseup":
          case "mouseleave": {
            console.log("leave");
            playingNotes.clear();
            track.allNotesOff();
          }
        }
      },
      [noteAtY, playingNotes, track],
    ),
  );

  const playingNotesHash = playingNotes._hash;
  useDrawOnCanvas(
    pianoRollCanvasRef,
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
    // update cursor to move on playback
    return player.addEventListener("frame", function updateMidiClipEditorCursor(playbackTimeSecs) {
      const cursorElem = cursorDiv.current;
      if (cursorElem == null) {
        return;
      }

      const playbackTimePulses = secsToPulses(playbackTimeSecs, bpm);
      // before
      if (playbackTimePulses < clip.timelineStart.pulses(project)) {
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
    });
  }, [bpm, clip, player, player.isAudioPlaying, project, secsToPixels]);

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
              } else {
                MidiClip.addNote(clip, tick, noteNum, DEFAULT_NOTE_DURATION, 100);
                track.flushClipStateToProcessor();
              }
            });
            break;
          }
          default:
            exhaustive(panelTool);
        }
      },
      [clip, noteHeight, project.panelTool, project.secondarySelection, track],
    ),
  );

  return (
    <>
      <ClipPropsEditor clip={clip} project={project} track={track} />

      <div className="grid grow" style={{ gridTemplateRows: "1fr auto", gridTemplateColumns: "auto 1fr", gap: 4 }}>
        <div className="flex flex-col">
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

          <input
            // onKeyDown={(e) => e.preventDefault()}
            // onKeyPress={(e) => e.preventDefault()}
            type="range"
            min={3}
            max={20}
            step={1}
            value={noteHeight}
            title="Vertical Zoom Level"
            className="grow"
            style={{
              marginTop: 4,
              writingMode: "vertical-lr",
              direction: "rtl",
            }}
            onChange={(e) => {
              const newVal = parseFloat(e.target.value);
              setNoteHeight(newVal);
            }}
          />
        </div>

        {/*  piano roll notes are PPQN / 4 wide */}

        <div
          ref={pianoRollRef}
          className="grid grow overflow-scroll"
          style={{ gridTemplateColumns: `${PIANO_ROLL_WIDTH}px auto` }}
        >
          <canvas
            ref={pianoRollCanvasRef}
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
          <div ref={editorContainerRef} className={cn("relative grow")}>
            <canvas
              ref={backgroundRef}
              height={CANVAS_SCALE * noteHeight * TOTAL_VERTICAL_NOTES}
              width={CANVAS_SCALE * clip.detailedViewport.pulsesToPx(timelineLen.pulses(project))}
              className="pointer-events-none absolute top-0 left-0"
              style={{
                height: noteHeight * TOTAL_VERTICAL_NOTES,
                background: "var(--timeline-bg)",
                width: clip.detailedViewport.pulsesToPx(timelineLen.pulses(project)),
                // imageRendering: "pixelated",
              }}
            />
            <div className={"relative"} style={{ height: noteHeight * TOTAL_VERTICAL_NOTES }} ref={containerRef}>
              <div
                className={cn("name-cursor", "absolute h-full pointer-events-none top-0 bg-[red] w-px")}
                ref={cursorDiv}
              />
              {notes.map((note, i) => {
                return (
                  <NoteR
                    track={track}
                    clip={clip}
                    key={i}
                    note={note}
                    viewport={clip.detailedViewport}
                    project={project}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div />

        <div className="flex flex-row">
          <div className="grow"></div>
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
      </div>
    </>
  );
}
