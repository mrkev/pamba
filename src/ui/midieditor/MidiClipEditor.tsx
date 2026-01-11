import { useLinkAsState } from "marked-subbable";
import { useCallback, useEffect, useRef, useState } from "react";
import { history, useContainer, usePrimitive } from "structured-state";
import { TOTAL_VERTICAL_NOTES } from "../../constants";
import { keyChord } from "../../input/KeyChord";
import { AnalizedPlayer } from "../../lib/io/AnalizedPlayer";
import { AudioProject } from "../../lib/project/AudioProject";
import { secsToPulses } from "../../lib/project/TimelineT";
import { midiClip, MidiClip } from "../../midi/MidiClip";
import { MidiTrack } from "../../midi/MidiTrack";
import { cn } from "../../utils/cn";
import { exhaustive } from "../../utils/exhaustive";
import { clamp } from "../../utils/math";
import { nullthrows } from "../../utils/nullthrows";
import { PPQN } from "../../wam/miditrackwam/MIDIConfiguration";
import { ClipPropsEditor } from "../ClipPropsEditor";
import { NoteR } from "../NoteR";
import { useDrawOnCanvas } from "../useDrawOnCanvas";
import { useEventListener } from "../useEventListener";
import { PointerPressMeta, usePointerPressMove } from "../usePointerPressMove";
import { UtilityToggle } from "../UtilityToggle";
import { MidiEditorGridBackground } from "./MidiEditorGridBackground";
import { useNotePointerCallbacks } from "./useNotePointerCallbacks";
import { VerticalPianoRollKeys } from "./VerticalPianoRollKeys";

const DEFAULT_NOTE_DURATION = 6;
const CLIP_TOTAL_BARS = 4;
export const CANVAS_SCALE = Math.floor(window.devicePixelRatio);
export const PIANO_ROLL_WIDTH = 24;
const MAX_H_SCALE = 20;

function secsToTicks(secs: number, tempo: number) {
  const oneBeatLen = 60 / tempo;
  const oneTickLen = oneBeatLen / PPQN;
  return (secs / oneTickLen) % (CLIP_TOTAL_BARS * PPQN);
}

function divSelectionBox(
  meta: PointerPressMeta,
  ev: PointerEvent,
  container: DOMRect,
): [x: number, y: number, w: number, h: number] {
  const pointerX = ev.clientX - container.left;
  const startX = meta.downX - container.left;

  const pointerY = ev.clientY - container.top;
  const startY = meta.downY - container.top;

  return [
    //
    Math.min(pointerX, startX),
    Math.min(pointerY, startY),
    Math.abs(ev.clientX - meta.downX),
    Math.abs(ev.clientY - meta.downY),
  ];
}

function useConditionalKeyboardEvents(enabled: boolean, keydown: (e: KeyboardEvent) => void) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    document.addEventListener("keydown", keydown);
    return () => {
      console.log("REMOVE");
      document.removeEventListener("keydown", keydown);
    };
  }, [enabled, keydown]);
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
  // const containerRef = useRef<HTMLDivElement>(null);
  const pianoRollRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const cursorDiv = useRef<HTMLDivElement>(null);
  const notes = useContainer(clip.buffer.notes);
  const [noteHeight, setNoteHeight] = usePrimitive(clip.detailedViewport.pxNoteHeight);
  const [pxPerPulse, setPxPerPulse] = usePrimitive(clip.detailedViewport.pxPerPulse);
  const [secondarySel] = useLinkAsState(project.secondarySelection);
  const [panelTool] = usePrimitive(project.panelTool);
  const [bpm] = usePrimitive(project.tempo);
  const timelineLen = useContainer(clip.timelineLength);
  const [selectionBox, setSelectionBox] = useState<null | [number, number, number, number]>(null);
  const [activePanel] = useLinkAsState(project.activePanel);

  useConditionalKeyboardEvents(
    activePanel === "secondary",
    useCallback((e: KeyboardEvent) => {
      switch (keyChord.ofEvent(e)) {
        case keyChord.ofKeys("KeyA", "meta"):
          // TODO: select all
          break;
        case keyChord.ofKeys("ArrowRight"):
        case keyChord.ofKeys("ArrowLeft"):
        case keyChord.ofKeys("ArrowUp"):
        case keyChord.ofKeys("ArrowDown"):
        default:
          console.log("none");
      }
    }, []),
  );

  useConditionalKeyboardEvents(
    activePanel === "secondary" && secondarySel?.status === "notes",
    useCallback(
      (e: KeyboardEvent) => {
        if (secondarySel?.status !== "notes") {
          throw new Error("impossible");
        }

        switch (keyChord.ofEvent(e)) {
          case keyChord.ofKeys("ArrowRight"):
          case keyChord.ofKeys("ArrowLeft"):
          case keyChord.ofKeys("ArrowUp"):
          case keyChord.ofKeys("ArrowDown"):
            // secondarySel.notes
            break;
          default:
            console.log("none");
        }
      },
      [secondarySel?.status],
    ),
  );

  const secsToPixels = useCallback(
    (secs: number, tempo: number) => {
      // TODO: we shouldn't need tempo for this if we do the math another way
      const ticks = secsToTicks(secs, tempo);
      return clip.detailedViewport.pulsesToPx(ticks);
    },
    [clip.detailedViewport],
  );

  usePointerPressMove(editorContainerRef, {
    move: useCallback((ev: PointerEvent, meta: PointerPressMeta) => {
      const containerRect = editorContainerRef.current?.getBoundingClientRect();
      if (containerRect == null) {
        return;
      }
      const box = divSelectionBox(meta, ev, containerRect);
      setSelectionBox(box);
    }, []),
    up: useCallback(
      (ev: PointerEvent, meta: PointerPressMeta) => {
        const containerRect = editorContainerRef.current?.getBoundingClientRect();
        if (containerRect == null) {
          return;
        }

        const [boxX, boxY, boxW, boxH] = divSelectionBox(meta, ev, containerRect);

        const minPulse = Math.floor(clip.detailedViewport.pxToPulses(boxX));
        const maxPulse = Math.floor(clip.detailedViewport.pxToPulses(boxW)) + minPulse;
        const minNote = Math.floor(clip.detailedViewport.pxToVerticalNotes(boxY));
        const maxNote = Math.floor(clip.detailedViewport.pxToVerticalNotes(boxH)) + minNote;

        const notes = midiClip.getNotesInRange(
          clip,
          minPulse,
          maxPulse,
          TOTAL_VERTICAL_NOTES - maxNote,
          TOTAL_VERTICAL_NOTES - minNote,
        );

        project.secondarySelection.set({
          status: "notes",
          notes: new Set(notes),
        });
        setSelectionBox(null);
      },
      [clip, project.secondarySelection],
    ),
  });

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
    editorContainerRef,
    useCallback(
      (e: MouseEvent) => {
        const clickedEditor = e.target === editorContainerRef.current;
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

  const noteEvents = useNotePointerCallbacks(panelTool, clip, track, project);

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
          <div className="sticky top-0 left-0 z-20 bg-timeline-tick border-b border-b-axis-timeline-separator"></div>

          <MidiEditorTimeAxis
            className="sticky top-0 bg-timeline-tick z-10 border-b border-b-axis-timeline-separator"
            style={{ left: PIANO_ROLL_WIDTH }}
            clip={clip}
            project={project}
          />

          <VerticalPianoRollKeys clip={clip} track={track} />
          <div ref={editorContainerRef} className={cn("relative grow")}>
            {/* background with lines */}
            <MidiEditorGridBackground clip={clip} project={project} />

            {/* notes */}
            {notes.map((note, i) => {
              const selected = secondarySel?.status === "notes" && secondarySel.notes.has(note);
              return (
                <NoteR
                  clip={clip}
                  key={i}
                  note={note}
                  viewport={clip.detailedViewport}
                  selected={selected}
                  onPointerDown={noteEvents.onNotePointerDown}
                  onPointerMove={noteEvents.onNotePointerMove}
                  onPointerUp={noteEvents.onNotePointerUp}
                />
              );
            })}

            {/* cursor */}
            <div
              className={cn("name-cursor", "absolute h-full pointer-events-none top-0 bg-[red] w-px")}
              ref={cursorDiv}
            />

            {/* selection box */}
            {selectionBox && (
              <div
                className={cn("name-selection-box", "absolute border border-blue-600/60 bg-blue-400/30 box-border")}
                style={{
                  left: selectionBox[0],
                  top: selectionBox[1],
                  width: selectionBox[2],
                  height: selectionBox[3],
                }}
              />
            )}
          </div>
          {/* </div> */}
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

function MidiEditorTimeAxis({
  className,
  style,
  clip,
  project,
}: {
  className?: string;
  style?: React.CSSProperties;
  clip: MidiClip;
  project: AudioProject;
}) {
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

        for (let i = 0; i < timelineLen.pulses(project); i += PPQN / 4) {
          if (i % 8 === 0) {
            ctx.strokeStyle = "#bbb";
            ctx.fillStyle = "#bbb";
          } else {
            ctx.strokeStyle = "#888";
            ctx.fillStyle = "#888";
          }
          const x = pxPerPulse * i + 0.5;

          ctx.fillText(`${i / PPQN}`, x + 2, 9);
          if (i === 0) {
            continue;
          }
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }

        ctx.scale(1, 1);
      },
      [timelineLen, project, pxPerPulse],
    ),
  );

  return (
    <canvas
      ref={backgroundRef}
      height={CANVAS_SCALE * noteHeight}
      width={CANVAS_SCALE * clip.detailedViewport.pulsesToPx(timelineLen.pulses(project))}
      className={className}
      style={{
        height: noteHeight,
        width: clip.detailedViewport.pulsesToPx(timelineLen.pulses(project)),
        imageRendering: "pixelated",
        ...style,
      }}
    />
  );
}
