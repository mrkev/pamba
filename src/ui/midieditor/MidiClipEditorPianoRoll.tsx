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
import { AudioProject, SecondaryTool } from "../../lib/project/AudioProject";
import { pulsesToSec, secsToPulses, secsToPulsesExact } from "../../lib/project/TimelineT";
import { midiViewport } from "../../lib/viewport/MidiViewport";
import { snapPulses } from "../../lib/viewport/snap";
import { MidiClip } from "../../midi/MidiClip";
import { midiClip } from "../../midi/MidiClipFn";
import { MidiNote } from "../../midi/MidiNote";
import { midiTrack, MidiTrack } from "../../midi/MidiTrack";
import { cn } from "../../utils/cn";
import { clamp } from "../../utils/math";
import { nullthrows } from "../../utils/nullthrows";
import { NoteR } from "../NoteR";
import { CursorLine } from "../TimelineCursor";
import { useEventListener } from "../useEventListener";
import { PointerPressMeta, usePointerPressMove } from "../usePointerPressMove";
import { useViewportScrollEvents } from "../useViewportScrollEvents";
import { divSelectionBox } from "./divSelectionBox";
import { MidiEditorGridBackground } from "./MidiEditorGridBackground";
import { MidiEditorTimeAxis } from "./MidiEditorTimeAxis";
import { VerticalPianoRollKeys } from "./VerticalPianoRollKeys";

// Extra px rendered beyond the visible window on each side, so notes don't pop in at the edges
// while panning/scrolling.
const VIRTUALIZE_OVERSCAN_PX = 128;

// How long a double-click-created note sounds when "hear notes" is on (there's no drag to hold it).
const DBLCLICK_AUDITION_MS = 200;

// A draw-tool press that moves less than this is a click (note gets the last length), not a drag.
const DRAW_DRAG_THRESHOLD_PX = 3;

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
  // in-progress draw-tool note being sized by dragging, if any
  const drawGestureRef = useRef<{ note: MidiNote; startTick: number } | null>(null);
  const [bpm] = usePrimitive(project.tempo);
  const [selectionBox, setSelectionBox] = useState<null | [number, number, number, number]>(null);
  const playbackDiv = useRef<HTMLDivElement>(null);
  const [noteHeight] = usePrimitive(clip.detailedViewport.pxNoteHeight);
  const [scrollLeftPx] = usePrimitive(clip.detailedViewport.scrollLeftPx);
  const [scrollTopPx] = usePrimitive(clip.detailedViewport.scrollTopPx);
  const [playbackPos] = usePrimitive(player.playbackPos);
  // Visible size of the note area, used to virtualize offscreen notes. Width is the note
  // column's width; height is the scroll viewport minus the sticky time-axis header (which
  // paints over the top of the notes). Both update when the resizable bottom panel changes.
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  // The project cursor is a timeline position, but the piano roll lays notes out clip-relative,
  // so express it in pulses past the clip's start. It's hidden when it falls outside the clip
  // (the container is `overflow-visible`, so an off-clip cursor would paint over the keys).
  const [cursorPos] = usePrimitive(project.cursorPos);
  const timelineStart = useContainer(clip.timelineStart);
  const timelineLength = useContainer(clip.timelineLength);
  const cursorPulsesInClip = secsToPulsesExact(cursorPos, bpm) - timelineStart.pulses(project);
  const cursorInClip = cursorPulsesInClip >= 0 && cursorPulsesInClip <= timelineLength.pulses(project);

  // Duration (in pulses) of a draw gesture given the current pointer x, snapped to grid. A click
  // (no real drag) uses the last drawn/resized length; a drag sizes the note to the pointer.
  const drawDuration = useCallback(
    (e: PointerEvent, startTick: number, downX: number) => {
      if (Math.abs(e.clientX - downX) < DRAW_DRAG_THRESHOLD_PX) {
        return project.midi.lastNoteDuration.get();
      }
      const pointerTick = startTick + Math.floor(clip.detailedViewport.pxToPulses(e.clientX - downX));
      const endTick = snapPulses(project, e, pointerTick);
      return Math.max(DEFAULT_NOTE_DURATION, endTick - startTick);
    },
    [clip.detailedViewport, project],
  );

  usePointerPressMove(editorContainerRef, {
    down: useCallback(
      (e: PointerEvent): void | "abort" => {
        if (project.panelTool.get() === "draw") {
          // clicking an existing note deletes it (handled by the note); only draw on empty space
          if (e.target !== editorContainerRef.current) {
            return "abort";
          }
          const TOTAL_HEIGHT = noteHeight * TOTAL_VERTICAL_NOTES;
          const num = Math.floor((TOTAL_HEIGHT - e.offsetY) / noteHeight);
          const startTick = Math.max(
            0,
            snapPulses(project, e, Math.floor(clip.detailedViewport.pxToPulses(e.offsetX)), "floor"),
          );
          // create the note live so it renders and can be sized by dragging; committed on up
          const note = midiClip.addNote(clip, startTick, num, project.midi.lastNoteDuration.get(), 100);
          drawGestureRef.current = { note, startTick };
          if (project.hearNotes.get()) {
            midiTrack.noteOn(track, num);
          }
          return;
        }
        // move tool: selection box handled in move/up
      },
      [clip, noteHeight, project, track],
    ),
    move: useCallback(
      (ev: PointerEvent, meta: PointerPressMeta) => {
        const draw = drawGestureRef.current;
        if (draw != null) {
          draw.note.duration = drawDuration(ev, draw.startTick, meta.downX);
          return;
        }
        const containerRect = editorContainerRef.current?.getBoundingClientRect();
        if (containerRect == null) {
          return;
        }
        setSelectionBox(divSelectionBox(meta, ev, containerRect));
      },
      [drawDuration],
    ),
    up: useCallback(
      (ev: PointerEvent, meta: PointerPressMeta) => {
        const draw = drawGestureRef.current;
        if (draw != null) {
          drawGestureRef.current = null;
          const duration = drawDuration(ev, draw.startTick, meta.downX);
          project.midi.lastNoteDuration.set(duration);
          const num = draw.note.number;
          // commit as one undo entry: drop the live note, then record its creation at the final size
          midiClip.removeNote(clip, draw.note);
          history.record("draw note", () => {
            midiClip.addNotes(clip, [[draw.startTick, num, duration, 100]]);
            midiTrack.flushAllClipStateToProcessor(track);
          });
          if (project.hearNotes.get()) {
            midiTrack.noteOff(track, num);
          }
          return;
        }

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

        project.secondarySelection.set({ status: "notes", clip, track });
        // shift+box adds to the current selection; a plain box replaces it
        clip.selectedNotes._replace((prev) => (ev.shiftKey ? new Set([...prev, ...notes]) : new Set(notes)));

        setSelectionBox(null);
      },
      [clip, track, project, drawDuration],
    ),
  });

  // keep the DOM scroll position in sync with the controlled viewport (both axes)
  useLayoutEffect(() => {
    const pianoRoll = nullthrows(pianoRollRef.current);
    pianoRoll.scrollTo({ left: scrollLeftPx, top: scrollTopPx, behavior: "instant" });
  }, [scrollLeftPx, scrollTopPx]);

  // Track the visible note-area size so PianoRollView can cull offscreen notes.
  useLayoutEffect(() => {
    const outer = pianoRollRef.current;
    const editor = editorContainerRef.current;
    if (outer == null || editor == null) {
      return;
    }
    const measure = () => {
      const outerRect = outer.getBoundingClientRect();
      const editorRect = editor.getBoundingClientRect();
      // Content-y of the note area's top (constant across scroll) == the time-axis header height.
      const axisHeight = editorRect.top - outerRect.top + outer.scrollTop;
      const width = editor.clientWidth;
      const height = outer.clientHeight - axisHeight;
      setViewport((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(editor);
    return () => observer.disconnect();
  }, []);

  useViewportScrollEvents(pianoRollRef, {
    scale: useCallback(
      (sDelta, mouseX) => {
        // max scale is 1000
        const expectedNewScale = clamp(
          MIDI_CLIP_EDITOR_MIN_H_SCALE,
          clip.detailedViewport.pxPerPulse.get() * sDelta,
          MIDI_CLIP_EDITOR_MAX_H_SCALE,
        );
        midiViewport.setXScale(clip.detailedViewport, expectedNewScale, mouseX);
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

    panY: useCallback(
      (deltaY, absolute) => {
        const top = absolute ? deltaY : clamp(0, clip.detailedViewport.scrollTopPx.get() + deltaY, Infinity);
        flushSync(() => {
          clip.detailedViewport.scrollTopPx.set(top);
        });
      },
      [clip.detailedViewport.scrollTopPx],
    ),
  });

  useEffect(() => {
    return player.addEventListener("frame", function updateMidiClipEditorCursor(playbackTimeSecs) {
      const playheadElem = playbackDiv.current;
      if (playheadElem == null) {
        return;
      }

      const playbackTimePulses = secsToPulses(playbackTimeSecs, bpm);
      // before
      if (playbackTimePulses < clip.timelineStart.pulses(project)) {
        playheadElem.style.display = "none";
        return;
      }

      // after
      if (playbackTimePulses > clip._timelineEndU) {
        playheadElem.style.display = "none";
        return;
      }

      playheadElem.style.display = "block";
    });
  }, [bpm, clip, player, player.isAudioPlaying, project]);

  useEventListener(
    "mousedown",
    editorContainerRef,
    useCallback(
      (e: MouseEvent) => {
        // draw is handled by the pointer gesture (create + drag-to-size); here we only clear the
        // note selection and move the cursor when pressing empty space with the move tool.
        if (project.panelTool.get() !== "move" || e.target !== editorContainerRef.current) {
          return;
        }
        // shift keeps the selection, so a shift+box can add to it
        if (!e.shiftKey) {
          project.secondarySelection.set(null);
          clip.selectedNotes.clear();
        }

        // `offsetX` is relative to the container, which scrolls with the notes, so it's already
        // in the same clip-relative space they're laid out in. Snap like the draw tool does, then
        // back to a timeline position, since the cursor is project-wide (paste reads it).
        const tick = Math.max(0, snapPulses(project, e, Math.floor(clip.detailedViewport.pxToPulses(e.offsetX))));
        project.cursorPos.set(pulsesToSec(clip.timelineStart.pulses(project) + tick, project.tempo.get()));
        project.selectionWidth.set(null);
      },
      [clip, project],
    ),
  );

  useEventListener(
    "dblclick",
    editorContainerRef,
    useCallback(
      (e: MouseEvent) => {
        // move tool: double-click empty space to create a note (deleting an existing note is
        // handled by the note itself). the draw tool already creates/deletes on single click.
        if (project.panelTool.get() !== "move" || e.target !== editorContainerRef.current) {
          return;
        }
        const TOTAL_HEIGHT = noteHeight * TOTAL_VERTICAL_NOTES;
        const noteNum = Math.floor((TOTAL_HEIGHT - e.offsetY) / noteHeight);
        // same grid snapping (toggle, resolution, meta bypass) as the draw tool
        const tick = Math.max(
          0,
          snapPulses(project, e, Math.floor(clip.detailedViewport.pxToPulses(e.offsetX)), "floor"),
        );

        history.record("draw note", () => {
          midiClip.addNotes(clip, [[tick, noteNum, project.midi.lastNoteDuration.get(), 100]]);
          midiTrack.flushAllClipStateToProcessor(track);
        });
        if (project.hearNotes.get()) {
          midiTrack.noteOn(track, noteNum);
          setTimeout(() => midiTrack.noteOff(track, noteNum), DBLCLICK_AUDITION_MS);
        }
      },
      [clip, noteHeight, project, track],
    ),
  );

  return (
    <div
      ref={pianoRollRef}
      className={cn("name-piano-roll", "grid grow overflow-y-scroll overflow-x-hidden shrink")}
      style={{ gridTemplateColumns: `${VERTICAL_PIANO_WIDTH}px 1fr`, gridTemplateRows: "1fr", alignItems: "stretch" }}
    >
      <div className="sticky top-0 left-0 z-20 bg-timeline-tick box-border"></div>

      <MidiEditorTimeAxis
        className="sticky top-0 z-10 border-b border-b-axis-timeline-separator"
        style={{ left: VERTICAL_PIANO_WIDTH }}
        clip={clip}
        project={project}
      />

      <VerticalPianoRollKeys clip={clip} track={track} />

      <PianoRollView
        project={project}
        track={track}
        clip={clip}
        viewportWidth={viewport.width}
        viewportHeight={viewport.height}
        ref={editorContainerRef}
      >
        {/* playback head */}
        <div
          className={cn("absolute h-full pointer-events-none top-0 bg-[red] w-px")}
          style={{ left: clip.detailedViewport.secsToPixels(playbackPos, bpm) }}
          ref={playbackDiv}
        />

        {/* cursor */}
        {cursorInClip && <CursorLine left={clip.detailedViewport.pulsesToPx(cursorPulsesInClip)} />}

        {selectionBox && (
          <div
            className="absolute border border-white/80 bg-white/10 box-border pointer-events-none"
            style={{
              left: selectionBox[0],
              top: selectionBox[1],
              width: selectionBox[2],
              height: selectionBox[3],
            }}
          />
        )}
      </PianoRollView>
    </div>
  );
}

function PianoRollView({
  project,
  track,
  clip,
  children,
  ref,
  className,
  viewportWidth,
  viewportHeight,
  ...rest
}: React.ComponentProps<"div"> & {
  project: AudioProject;
  track: MidiTrack;
  clip: MidiClip;
  children?: ReactNode;
  viewportWidth: number;
  viewportHeight: number;
}) {
  const notes = useContainer(clip.buffer.notes);
  const clipSel = useContainer(clip.selectedNotes);
  const [panelTool] = usePrimitive<SecondaryTool>(project.panelTool);
  // Read the viewport primitives here (not just in the parent) so this component re-renders,
  // and thus re-culls, on pan/zoom.
  const [pxPerPulse] = usePrimitive(clip.detailedViewport.pxPerPulse);
  const [noteHeight] = usePrimitive(clip.detailedViewport.pxNoteHeight);
  const [scrollLeftPx] = usePrimitive(clip.detailedViewport.scrollLeftPx);
  const [scrollTopPx] = usePrimitive(clip.detailedViewport.scrollTopPx);

  // Cull notes outside the visible window (+ overscan) so large clips don't mount thousands of
  // offscreen <NoteR>s. Notes are laid out bottom-up (`bottom: num * noteHeight`), so note `num`
  // spans editor-local y `[totalHeight - (num + 1) * noteHeight, totalHeight - num * noteHeight]`,
  // while the visible window is `[scrollTopPx, scrollTopPx + viewportHeight]` (and likewise in x).
  // Selected notes are always rendered: an in-progress drag captures the pointer on the note's
  // element, so unmounting it mid-gesture would break the edit — and a moved note is always selected.
  const measured = viewportWidth > 0 && viewportHeight > 0;
  const totalHeight = TOTAL_VERTICAL_NOTES * noteHeight;
  const visLeft = scrollLeftPx - VIRTUALIZE_OVERSCAN_PX;
  const visRight = scrollLeftPx + viewportWidth + VIRTUALIZE_OVERSCAN_PX;
  const visTop = scrollTopPx - VIRTUALIZE_OVERSCAN_PX;
  const visBottom = scrollTopPx + viewportHeight + VIRTUALIZE_OVERSCAN_PX;
  const isNoteVisible = (note: MidiNote): boolean => {
    if (!measured || clipSel.has(note)) {
      return true;
    }
    const [tick, num, duration] = note.t;
    const left = tick * pxPerPulse;
    const right = left + duration * pxPerPulse;
    if (right < visLeft || left > visRight) {
      return false;
    }
    const noteTop = totalHeight - (num + 1) * noteHeight;
    const noteBottom = totalHeight - num * noteHeight;
    return noteBottom >= visTop && noteTop <= visBottom;
  };

  return (
    <div
      ref={ref}
      className={cn(
        "name-note-editor",
        "relative max-w-full max-h-full overflow-visible",
        panelTool === "draw" && "pencil_cursor",
        panelTool === "move" && "cursor-default",
        className,
      )}
      {...rest}
    >
      {/* background with lines */}
      <MidiEditorGridBackground clip={clip} project={project} />

      {/* notes (only those intersecting the viewport; see isNoteVisible) */}
      {notes.filter(isNoteVisible).map((note) => {
        return (
          <NoteR
            resizable={panelTool === "move"}
            key={note._id}
            note={note}
            clip={clip}
            track={track}
            project={project}
            selected={clipSel.has(note)}
          />
        );
      })}
      {children}
    </div>
  );
}
