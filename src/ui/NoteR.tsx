import { useCallback, useMemo, useRef } from "react";
import { useContainer, usePrimitive, useSubscribeToSubbableMutationHashable } from "structured-state";
import { AudioProject } from "../lib/project/AudioProject";
import { MidiClip } from "../midi/MidiClip";
import { midiClip, NOTE_MAX_VELOCITY, NOTE_MIN_SIZE_PULSES, NOTE_MIN_VELOCITY } from "../midi/MidiClipFn";
import { MidiNote } from "../midi/MidiNote";
import { midiTrack, MidiTrack } from "../midi/MidiTrack";
import { NoteT } from "../midi/SharedMidiTypes";
import { snapPulses } from "../lib/viewport/snap";
import { cn } from "../utils/cn";
import { clamp } from "../utils/math";
import { useEventListener } from "./useEventListener";
import { PointerPressMeta, usePointerEditing } from "./usePointerPressMove";

export type NoteCtx = Readonly<{ note: MidiNote; clip: MidiClip; track: MidiTrack; project: AudioProject }>;

/** note -> its `[tick, number, duration, velocity]` at the start of an edit gesture */
type NoteEditOriginals = {
  notes: Map<MidiNote, NoteT>;
  /** pitch currently sounding for drag preview, if any (mutated as the drag crosses pitches) */
  preview: { pitch: number | null };
  /** move-gesture sub-mode chosen at press: plain drag moves, alt-drag edits velocity */
  mode: "move" | "velocity";
};

/** vertical px the pointer travels per unit of MIDI velocity while alt-dragging a note */
const VELOCITY_DRAG_PX_PER_UNIT = 2;

export function NoteR({
  note,
  clip,
  track,
  project,
  selected,
  resizable,
  className,
  style,
}: {
  note: MidiNote;
  clip: MidiClip;
  track: MidiTrack;
  project: AudioProject;
  selected: boolean;
  resizable: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);
  const [noteHeight] = usePrimitive(clip.detailedViewport.pxNoteHeight);
  const mnote = useContainer(note);
  const [tick, num, duration, velocity] = mnote.t;

  const ctx = useMemo(() => ({ note, clip, track, project }), [clip, note, project, track]);

  useSubscribeToSubbableMutationHashable(clip);

  // Snapshot the notes an edit gesture applies to, at gesture start: the whole selection if
  // this note is part of it, otherwise just this note. Keyed by note so each moves/resizes
  // relative to its own start value.
  const captureEdit = useCallback((): NoteEditOriginals => {
    const source = clip.selectedNotes.has(note) ? clip.selectedNotes : [note];
    const notes = new Map<MidiNote, NoteT>();
    for (const n of source) {
      notes.set(n, n.t);
    }
    return { notes, preview: { pitch: null }, mode: "move" };
  }, [clip.selectedNotes, note]);

  // notes only have an end resizer
  const isResizing = usePointerEditing<NoteEditOriginals>(resizerRef, captureEdit, {
    down: useCallback(
      (e: PointerEvent, original: NoteEditOriginals) => resizeDown(e, { target: ctx, original }),
      [ctx],
    ),
    up: useCallback(
      (e: PointerEvent, start: PointerPressMeta, original: NoteEditOriginals) =>
        resizeUp(e, { start, target: ctx, original }),
      [ctx],
    ),
    move: useCallback(
      (e: PointerEvent, start: PointerPressMeta, original: NoteEditOriginals) =>
        resizeMove(e, { start, target: ctx, original }),
      [ctx],
    ),
  });

  usePointerEditing<NoteEditOriginals>(divRef, captureEdit, {
    down: useCallback((e: PointerEvent, original: NoteEditOriginals) => moveDown(e, { target: ctx, original }), [ctx]),
    up: useCallback(
      (e: PointerEvent, start: PointerPressMeta, original: NoteEditOriginals) =>
        moveUp(e, { start, target: ctx, original }),
      [ctx],
    ),
    move: useCallback(
      (e: PointerEvent, start: PointerPressMeta, original: NoteEditOriginals) =>
        moveMove(e, { start, target: ctx, original }),
      [ctx],
    ),
  });

  useEventListener(
    "dblclick",
    divRef,
    useCallback(
      (e: MouseEvent) => {
        // move tool: double-click a note to delete it (draw tool deletes on single click)
        if (project.panelTool.get() !== "move") {
          return;
        }
        e.stopPropagation();
        midiClip.deleteNotes(track, clip, [note]);
      },
      [clip, note, project.panelTool, track],
    ),
  );

  const width = clip.detailedViewport.pulsesToPx(duration) + 1;
  const showResizers = (resizable && width > 15) || isResizing;

  return (
    <div
      ref={divRef}
      className={cn(
        "absolute bg-midi-note border border-midi-note-border box-border overflow-hidden",
        selected && "bg-midi-note-selected",
        className,
      )}
      style={{
        bottom: num * noteHeight - 1,
        left: clip.detailedViewport.pulsesToPx(tick),
        height: noteHeight + 1,
        width: clip.detailedViewport.pulsesToPx(duration) + 1,
        opacity: velocity / 100,
        ...style,
      }}
    >
      {showResizers && (
        <div
          ref={resizerRef}
          className={cn("absolute top-0 right-0 h-full cursor-ew-resize bg-midi-note-border")}
          style={{ width: 10 }}
        />
      )}
    </div>
  );
}

/** EVENTS */

type NoteEditStartEvent = {
  original: NoteEditOriginals;
  target: NoteCtx;
};

type NoteEditEvent = {
  target: NoteCtx;
  start: PointerPressMeta;
  original: NoteEditOriginals;
};

/** Pointer -> (deltaTick, deltaNumber) for a move, with the anchor note's new start snapped to grid. */
function moveDeltas(e: PointerEvent, re: NoteEditEvent): [deltaTick: number, deltaNumber: number] {
  const { clip, project, note } = re.target;
  const viewport = clip.detailedViewport;
  const rawDeltaTick = Math.floor(viewport.pxToPulses(e.clientX - re.start.downX));
  const deltaNumber = -Math.floor(viewport.pxToVerticalNotes(e.clientY - re.start.downY));
  const anchor = re.original.notes.get(note);
  const deltaTick = anchor != null ? snapPulses(project, e, anchor[0] + rawDeltaTick) - anchor[0] : rawDeltaTick;
  return [deltaTick, deltaNumber];
}

/** Pointer -> deltaDuration for a resize, with the anchor note's new end snapped to grid. */
function resizeDeltaDuration(e: PointerEvent, re: NoteEditEvent): number {
  const { clip, project, note } = re.target;
  const rawDelta = Math.floor(clip.detailedViewport.pxToPulses(e.clientX - re.start.downX));
  const anchor = re.original.notes.get(note);
  const end = (anchor != null ? anchor[0] : note.tick) + (anchor != null ? anchor[2] : note.duration);
  return snapPulses(project, e, end + rawDelta) - end;
}

/** Pointer -> velocity delta for an alt-drag (drag up raises velocity). */
function velocityDelta(e: PointerEvent, re: NoteEditEvent): number {
  return Math.round(-(e.clientY - re.start.downY) / VELOCITY_DRAG_PX_PER_UNIT);
}

/** RESIZING */

function resizeDown(e: PointerEvent, _re: NoteEditStartEvent) {
  // keep this event on the resizer; don't let it reach the note body (which would move)
  e.stopPropagation();
}

function resizeMove(e: PointerEvent, re: NoteEditEvent) {
  const deltaDuration = resizeDeltaDuration(e, re);
  // live preview: resize each note relative to its own start duration
  for (const [note, [, , duration]] of re.original.notes) {
    note.duration = Math.max(NOTE_MIN_SIZE_PULSES, duration + deltaDuration);
  }
}

function resizeUp(e: PointerEvent, re: NoteEditEvent) {
  midiClip.resizeNotes(re.target.track, re.target.clip, re.original.notes, resizeDeltaDuration(e, re));
}

/** MOVING */

function moveDown(e: PointerEvent, re: NoteEditStartEvent): void | "abort" {
  // don't let the container capture the pointer and start a selection box
  e.preventDefault();
  e.stopPropagation();

  const { clip, note, project, track } = re.target;

  // draw tool: clicking an existing note deletes it (no move/selection gesture)
  if (project.panelTool.get() === "draw") {
    midiClip.deleteNotes(track, clip, [note]);
    return "abort";
  }

  // alt-drag edits velocity instead of moving the note(s)
  re.original.mode = e.altKey ? "velocity" : "move";

  // Grabbing an unselected note selects just it; grabbing a selected note keeps the whole
  // selection so the group edits together (the affected set was captured in `original`).
  if (!clip.selectedNotes.has(note)) {
    clip.selectedNotes.clear();
    clip.selectedNotes.add(note);
  }
  // reflect the note selection at the project level so keyboard actions (nudge/delete) fire,
  // and focus the editor panel so Backspace/Delete target notes rather than the clip
  project.secondarySelection.set({ status: "notes", clip, track });
  project.activePanel.set("secondary");

  // audible pitch preview only when moving (not when scrubbing velocity)
  if (re.original.mode === "move" && project.hearNotes.get()) {
    midiTrack.noteOn(track, note.number);
    re.original.preview.pitch = note.number;
  }
}

function moveMove(e: PointerEvent, re: NoteEditEvent) {
  if (re.original.mode === "velocity") {
    const delta = velocityDelta(e, re);
    // live preview: set each note's velocity relative to its own start velocity
    for (const [note, [, , , velocity]] of re.original.notes) {
      note.velocity = clamp(NOTE_MIN_VELOCITY, velocity + delta, NOTE_MAX_VELOCITY);
    }
    return;
  }

  const [deltaTick, deltaNumber] = moveDeltas(e, re);
  const [clampedTick, clampedNumber] = midiClip.clampNoteMove(re.original.notes, deltaTick, deltaNumber);
  // live preview: move each note relative to its own start position
  for (const [note, [tick, number]] of re.original.notes) {
    note.tick = tick + clampedTick;
    note.number = number + clampedNumber;
  }

  // audible preview: as the drag crosses pitches, sound the dragged note's new pitch
  if (re.target.project.hearNotes.get() && re.original.preview.pitch !== re.target.note.number) {
    if (re.original.preview.pitch != null) {
      midiTrack.noteOff(re.target.track, re.original.preview.pitch);
    }
    midiTrack.noteOn(re.target.track, re.target.note.number);
    re.original.preview.pitch = re.target.note.number;
  }
}

function moveUp(e: PointerEvent, re: NoteEditEvent) {
  if (re.original.mode === "velocity") {
    midiClip.setVelocities(re.target.track, re.target.clip, re.original.notes, velocityDelta(e, re));
    return;
  }

  const [deltaTick, deltaNumber] = moveDeltas(e, re);
  midiClip.moveNotes(re.target.track, re.target.clip, re.original.notes, deltaTick, deltaNumber);

  // stop whatever pitch the drag preview last sounded (unconditional, to avoid stuck notes)
  if (re.original.preview.pitch != null) {
    midiTrack.noteOff(re.target.track, re.original.preview.pitch);
    re.original.preview.pitch = null;
  }
}
