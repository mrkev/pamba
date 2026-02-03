import { useLinkAsState } from "marked-subbable";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { history, useContainer, usePrimitive } from "structured-state";
import {
  DEFAULT_NOTE_DURATION,
  MIDI_CLIP_EDITOR_MAX_H_SCALE,
  TOTAL_VERTICAL_NOTES,
  VERTICAL_PIANO_WIDTH,
} from "../../constants";
import { AnalizedPlayer } from "../../lib/io/AnalizedPlayer";
import { AudioProject } from "../../lib/project/AudioProject";
import { secsToPulses } from "../../lib/project/TimelineT";
import { MidiClip, midiClip } from "../../midi/MidiClip";
import { MidiTrack } from "../../midi/MidiTrack";
import { cn } from "../../utils/cn";
import { exhaustive } from "../../utils/exhaustive";
import { clamp } from "../../utils/math";
import { nullthrows } from "../../utils/nullthrows";
import { PPQN } from "../../wam/miditrackwam/MIDIConfiguration";
import { NoteR } from "../NoteR";
import { useEventListener } from "../useEventListener";
import { PointerPressMeta, usePointerPressMove } from "../usePointerPressMove";
import { divSelectionBox } from "./divSelectionBox";
import { MidiEditorGridBackground } from "./MidiEditorGridBackground";
import { useNotePointerCallbacks } from "./useNotePointerCallbacks";
import { VerticalPianoRollKeys } from "./VerticalPianoRollKeys";
import { useViewportScrollEvents } from "./useViewportScrollEvents";

const CLIP_TOTAL_BARS = 4;

export function MidiClipEditorPianoRoll({
  clip,
  track,
  project,
  player,
}: {
  clip: MidiClip;
  track: MidiTrack;
  project: AudioProject;
  player: AnalizedPlayer;
}) {
  const pianoRollRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const notes = useContainer(clip.buffer.notes);
  const [bpm] = usePrimitive(project.tempo);
  const timelineLen = useContainer(clip.timelineLength);
  const [selectionBox, setSelectionBox] = useState<null | [number, number, number, number]>(null);
  const clipSel = useContainer(clip.selectedNotes);
  const cursorDiv = useRef<HTMLDivElement>(null);
  const [noteHeight, setNoteHeight] = usePrimitive(clip.detailedViewport.pxNoteHeight);
  const [pxPerPulse, setPxPerPulse] = usePrimitive(clip.detailedViewport.pxPerPulse);
  const [secondarySel] = useLinkAsState(project.secondarySelection);
  const [panelTool] = usePrimitive(project.panelTool);
  const [activePanel] = useLinkAsState(project.activePanel);

  const secsToPixels = useCallback(
    (secs: number, tempo: number) => {
      // TODO: we shouldn't need tempo for this if we do the math another way

      // secs to pulses
      const oneBeatLen = 60 / tempo;
      const oneTickLen = oneBeatLen / PPQN;
      const pulses = (secs / oneTickLen) % (CLIP_TOTAL_BARS * PPQN);

      return clip.detailedViewport.pulsesToPx(pulses);
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

        const notes = midiClip.findNotesInRange(
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
        clip.selectedNotes._replace(() => new Set(notes));

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
          clip.detailedViewport.setHScale(expectedNewScale, 1, MIDI_CLIP_EDITOR_MAX_H_SCALE, mouseX);
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

        const prevNote = midiClip.findNote(clip, tick, noteNum);
        const panelTool = project.panelTool.get();

        switch (panelTool) {
          case "move": {
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
                midiClip.addNote(clip, tick, noteNum, DEFAULT_NOTE_DURATION, 100);
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

  const noteEvents = useNotePointerCallbacks(panelTool);

  return (
    <div
      ref={pianoRollRef}
      className={cn("name-piano-roll", "grid grow overflow-scroll shrink")}
      style={{ gridTemplateColumns: `${VERTICAL_PIANO_WIDTH}px 1fr`, gridTemplateRows: "1fr", alignItems: "stretch" }}
    >
      <div className="sticky top-0 left-0 z-20 bg-timeline-tick box-border"></div>

      {/* width is set to whole notes, virtualize this */}
      <div className="h-[10px] w-full bg-red-500 sticky top-0 z-10" style={{ left: VERTICAL_PIANO_WIDTH }} />
      {/* <MidiEditorTimeAxis
                  className="sticky top-0 bg-timeline-tick z-10 border-b border-b-axis-timeline-separator"
                  style={{ left: PIANO_ROLL_WIDTH }}
                  clip={clip}
                  project={project}
                /> */}

      <VerticalPianoRollKeys clip={clip} track={track} />

      <PianoRollView project={project} track={track} clip={clip} />
    </div>
  );
}

function PianoRollView({ project, track, clip }: { project: AudioProject; track: MidiTrack; clip: MidiClip }) {
  const prRef = useRef<HTMLDivElement>(null);
  const notes = useContainer(clip.buffer.notes);
  const [selectionBox, setSelectionBox] = useState<null | [number, number, number, number]>(null);
  const clipSel = useContainer(clip.selectedNotes);
  const cursorDiv = useRef<HTMLDivElement>(null);
  const [secondarySel] = useLinkAsState(project.secondarySelection);
  const [panelTool] = usePrimitive(project.panelTool);
  const [scrollLeftPx] = usePrimitive(clip.detailedViewport.scrollLeftPx);

  const noteEvents = useNotePointerCallbacks(panelTool);
  useViewportScrollEvents(clip, prRef);

  useLayoutEffect(() => {
    if (!prRef) {
      return;
    }
    prRef.current?.scrollTo({ left: scrollLeftPx, behavior: "instant" });
  }, [scrollLeftPx]);

  return (
    <div ref={prRef} className={cn("name-note-editor", "relative max-w-full max-h-full overflow-visible")}>
      {/* background with lines */}
      <MidiEditorGridBackground clip={clip} project={project} />

      {/* notes */}
      {notes.map((note, i) => {
        const selected = (secondarySel?.status === "notes" && secondarySel.notes.has(note)) || clipSel.has(note);
        return (
          <NoteR
            resizable={panelTool === "move"}
            key={i}
            note={note}
            clip={clip}
            track={track}
            project={project}
            selected={selected}
            onPointerDown={noteEvents.onNotePointerDown}
            onPointerMove={noteEvents.onNotePointerMove}
            onPointerUp={noteEvents.onNotePointerUp}
          />
        );
      })}

      {/* cursor */}
      <div
        className={cn("name-sec-cursor", "absolute h-full pointer-events-none top-0 bg-[red] w-px")}
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
  );
}
