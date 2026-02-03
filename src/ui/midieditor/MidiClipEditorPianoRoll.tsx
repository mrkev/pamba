import { useLinkAsState } from "marked-subbable";
import { ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { history, useContainer, usePrimitive } from "structured-state";
import {
  DEFAULT_NOTE_DURATION,
  MIDI_CLIP_EDITOR_MAX_H_SCALE,
  MIDI_CLIP_EDITOR_MIN_H_SCALE,
  TOTAL_VERTICAL_NOTES,
  VERTICAL_PIANO_WIDTH,
} from "../../constants";
import { AnalizedPlayer } from "../../lib/io/AnalizedPlayer";
import { AudioProject } from "../../lib/project/AudioProject";
import { secsToPulses } from "../../lib/project/TimelineT";
import { MidiClip, midiClip } from "../../midi/MidiClip";
import { midiTrack, MidiTrack } from "../../midi/MidiTrack";
import { cn } from "../../utils/cn";
import { exhaustive } from "../../utils/exhaustive";
import { clamp } from "../../utils/math";
import { nullthrows } from "../../utils/nullthrows";
import { PPQN } from "../../wam/miditrackwam/MIDIConfiguration";
import { NoteR } from "../NoteR";
import { useEventListener } from "../useEventListener";
import { PointerPressMeta, usePointerPressMove } from "../usePointerPressMove";
import { useViewportScrollEvents } from "../useViewportScrollEvents";
import { divSelectionBox } from "./divSelectionBox";
import { MidiEditorGridBackground } from "./MidiEditorGridBackground";
import { useNotePointerCallbacks } from "./useNotePointerCallbacks";
import { VerticalPianoRollKeys } from "./VerticalPianoRollKeys";

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
  const [bpm] = usePrimitive(project.tempo);
  const [selectionBox, setSelectionBox] = useState<null | [number, number, number, number]>(null);
  const cursorDiv = useRef<HTMLDivElement>(null);
  const [noteHeight, setNoteHeight] = usePrimitive(clip.detailedViewport.pxNoteHeight);
  const [scrollLeftPx] = usePrimitive(clip.detailedViewport.scrollLeftPx);

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

  // on first render, set the scroll
  useEffect(() => {
    const pianoRoll = nullthrows(pianoRollRef.current);
    pianoRoll.scrollTo({
      left: clip.detailedViewport.scrollLeftPx.get(),
      top: clip.detailedViewport.scrollTopPx.get(),
    });
  }, [clip.detailedViewport.scrollLeftPx, clip.detailedViewport.scrollTopPx]);

  useLayoutEffect(() => {
    const pianoRoll = nullthrows(pianoRollRef.current);

    if (!pianoRoll) {
      return;
    }

    pianoRoll.scrollTo({ left: scrollLeftPx, behavior: "instant" });
  }, [scrollLeftPx]);

  useViewportScrollEvents(pianoRollRef, {
    scale: useCallback(
      (sDelta, mouseX) => {
        // max scale is 1000
        const expectedNewScale = clamp(
          MIDI_CLIP_EDITOR_MIN_H_SCALE,
          clip.detailedViewport.pxPerPulse.get() * sDelta,
          MIDI_CLIP_EDITOR_MAX_H_SCALE,
        );
        clip.detailedViewport.setScale(expectedNewScale, mouseX);
      },
      [clip.detailedViewport],
    ),

    panX: useCallback(
      (deltaX, absolute) => {
        const left = absolute ? deltaX : clamp(0, clip.detailedViewport.scrollLeftPx.get() + deltaX, Infinity);
        flushSync(() => {
          clip.detailedViewport.scrollLeftPx.set(left);
        });
      },
      [clip.detailedViewport.scrollLeftPx],
    ),
  });

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
                midiTrack.flushAllClipStateToProcessor(track);
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
    <div
      ref={pianoRollRef}
      className={cn("name-piano-roll", "grid grow overflow-y-scroll overflow-x-hidden shrink")}
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

      <PianoRollView project={project} track={track} clip={clip}>
        {/* cursor */}
        <div
          className={cn("name-sec-cursor", "absolute h-full pointer-events-none top-0 bg-[red] w-px")}
          ref={cursorDiv}
        />
      </PianoRollView>
    </div>
  );
}

function PianoRollView({
  project,
  track,
  clip,
  children,
}: {
  project: AudioProject;
  track: MidiTrack;
  clip: MidiClip;
  children?: ReactNode;
}) {
  const prRef = useRef<HTMLDivElement>(null);
  const notes = useContainer(clip.buffer.notes);
  const [selectionBox] = useState<null | [number, number, number, number]>(null);
  const clipSel = useContainer(clip.selectedNotes);
  const [secondarySel] = useLinkAsState(project.secondarySelection);
  const [panelTool] = usePrimitive(project.panelTool);
  const noteEvents = useNotePointerCallbacks(panelTool);

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

      {children}

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
