import { useCallback, useMemo, useRef } from "react";
import { useContainer, usePrimitive, useSubscribeToSubbableMutationHashable } from "structured-state";
import { AudioProject } from "../lib/project/AudioProject";
import { midiClip, MidiClip, NOTE_MIN_SIZE_PULSES } from "../midi/MidiClip";
import { MidiNote } from "../midi/MidiNote";
import { midiTrack, MidiTrack } from "../midi/MidiTrack";
import { NoteT } from "../midi/SharedMidiTypes";
import { cn } from "../utils/cn";
import { PointerPressMeta, usePointerEditing } from "./usePointerPressMove";

export type NoteCtx = Readonly<{ note: MidiNote; clip: MidiClip; track: MidiTrack; project: AudioProject }>;

/** note -> its `[tick, number, duration, velocity]` at the start of an edit gesture */
type NoteEditOriginals = { notes: Map<MidiNote, NoteT> };

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
    return { notes };
  }, [clip.selectedNotes, note]);

  // notes only have an end resizer
  const isResizing = usePointerEditing<NoteEditOriginals>(resizerRef, captureEdit, {
    down: useCallback((e: PointerEvent, original: NoteEditOriginals) => resizeDown(e, { target: ctx, original }), [ctx]),
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

/** RESIZING */

function resizeDown(e: PointerEvent, _re: NoteEditStartEvent) {
  // keep this event on the resizer; don't let it reach the note body (which would move)
  e.stopPropagation();
}

function resizeMove(e: PointerEvent, re: NoteEditEvent) {
  const deltaDuration = Math.floor(re.target.clip.detailedViewport.pxToPulses(e.clientX - re.start.downX));
  // live preview: resize each note relative to its own start duration
  for (const [note, [, , duration]] of re.original.notes) {
    note.duration = Math.max(NOTE_MIN_SIZE_PULSES, duration + deltaDuration);
  }
}

function resizeUp(e: PointerEvent, re: NoteEditEvent) {
  const deltaDuration = Math.floor(re.target.clip.detailedViewport.pxToPulses(e.clientX - re.start.downX));
  midiClip.resizeNotes(re.target.track, re.target.clip, re.original.notes, deltaDuration);
}

/** MOVING */

function moveDown(e: PointerEvent, re: NoteEditStartEvent) {
  // don't let the container capture the pointer and start a selection box
  e.preventDefault();
  e.stopPropagation();

  const { clip, note, project, track } = re.target;

  // Grabbing an unselected note selects just it; grabbing a selected note keeps the whole
  // selection so the group moves together (the moving set was captured in `original`).
  if (!clip.selectedNotes.has(note)) {
    clip.selectedNotes.clear();
    clip.selectedNotes.add(note);
  }
  // reflect the note selection at the project level so keyboard actions (nudge/delete) fire
  project.secondarySelection.set({ status: "notes", clip, track });

  if (project.hearNotes.get()) {
    midiTrack.noteOn(track, note.number);
  }
}

function moveMove(e: PointerEvent, re: NoteEditEvent) {
  const viewport = re.target.clip.detailedViewport;
  const deltaTick = Math.floor(viewport.pxToPulses(e.clientX - re.start.downX));
  const deltaNumber = -Math.floor(viewport.pxToVerticalNotes(e.clientY - re.start.downY));
  const [clampedTick, clampedNumber] = midiClip.clampNoteMove(re.original.notes, deltaTick, deltaNumber);
  // live preview: move each note relative to its own start position
  for (const [note, [tick, number]] of re.original.notes) {
    note.tick = tick + clampedTick;
    note.number = number + clampedNumber;
  }
}

function moveUp(e: PointerEvent, re: NoteEditEvent) {
  const viewport = re.target.clip.detailedViewport;
  const deltaTick = Math.floor(viewport.pxToPulses(e.clientX - re.start.downX));
  const deltaNumber = -Math.floor(viewport.pxToVerticalNotes(e.clientY - re.start.downY));
  midiClip.moveNotes(re.target.track, re.target.clip, re.original.notes, deltaTick, deltaNumber);

  if (re.target.project.hearNotes.get()) {
    const original = re.original.notes.get(re.target.note);
    midiTrack.noteOff(re.target.track, original ? original[1] : re.target.note.number);
  }
}
