import { useCallback, useMemo, useRef } from "react";
import { useContainer, usePrimitive, useSubscribeToSubbableMutationHashable } from "structured-state";
import { AudioProject } from "../lib/project/AudioProject";
import { midiBuffer } from "../midi/MidiBuffer";
import { midiClip, MidiClip } from "../midi/MidiClip";
import { MidiNote } from "../midi/MidiNote";
import { midiTrack, MidiTrack } from "../midi/MidiTrack";
import { NoteT } from "../midi/SharedMidiTypes";
import { cn } from "../utils/cn";
import { PointerPressMeta, usePointerEditing } from "./usePointerPressMove";

export type NoteCtx = Readonly<{ note: MidiNote; clip: MidiClip; track: MidiTrack; project: AudioProject }>;

const NOTE_MIN_SIZE_PULSES = 2;

export function NoteR({
  note,
  clip,
  track,
  project,
  selected,
  resizable,
  className,
  style,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  note: MidiNote;
  clip: MidiClip;
  track: MidiTrack;
  project: AudioProject;
  selected: boolean;
  resizable: boolean;
  className?: string;
  style?: React.CSSProperties;
  onPointerDown: (e: PointerEvent, ctx: NoteCtx) => void;
  onPointerMove: (e: PointerEvent, meta: PointerPressMeta, ctx: NoteCtx) => void;
  onPointerUp: (e: PointerEvent, meta: PointerPressMeta, ctx: NoteCtx) => void;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);
  const [noteHeight] = usePrimitive(clip.detailedViewport.pxNoteHeight);
  const mnote = useContainer(note);
  const [tick, num, duration, velocity] = mnote.t;

  const ctx = useMemo(() => ({ note, clip, track, project }), [clip, note, project, track]);

  useSubscribeToSubbableMutationHashable(clip);

  // usePointerPressMove(divRef, {
  //   down: useCallback((e: PointerEvent) => onPointerDown(e, ctx), [ctx, onPointerDown]),
  //   up: useCallback((e: PointerEvent, meta: PointerPressMeta) => onPointerUp(e, meta, ctx), [ctx, onPointerUp]),
  //   move: useCallback((e: PointerEvent, meta: PointerPressMeta) => onPointerMove(e, meta, ctx), [ctx, onPointerMove]),
  // });

  // notes only have an end resizer
  const isResizing = usePointerEditing(
    resizerRef,
    useCallback(() => note.t, [note.t]),
    {
      down: useCallback((e: PointerEvent, original: NoteT) => resizeDown(e, { target: ctx, original }), [ctx]),
      up: useCallback(
        (e: PointerEvent, start: PointerPressMeta, original: NoteT) => resizeUp(e, { start, target: ctx, original }),
        [ctx],
      ),
      move: useCallback(
        (e: PointerEvent, start: PointerPressMeta, original: NoteT) => resizeMove(e, { start, target: ctx, original }),
        [ctx],
      ),
    },
  );

  // notes only have an end resizer
  const isMoving = usePointerEditing(
    divRef,
    useCallback(() => note.t, [note.t]),
    {
      down: useCallback((e: PointerEvent, original: NoteT) => moveDown(e, { target: ctx, original }), [ctx]),
      up: useCallback(
        (e: PointerEvent, start: PointerPressMeta, original: NoteT) => moveUp(e, { start, target: ctx, original }),
        [ctx],
      ),
      move: useCallback(
        (e: PointerEvent, start: PointerPressMeta, original: NoteT) => moveMove(e, { start, target: ctx, original }),
        [ctx],
      ),
    },
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
  original: NoteT;
  target: NoteCtx;
};

type NoteEditEvent = {
  target: NoteCtx;
  start: PointerPressMeta;
  original: NoteT;
};

/** RESIZING */

function resizeDown(e: PointerEvent, _re: NoteEditStartEvent) {
  // so it doesn't reach the note body, we only want this event in the resizer
  e.stopPropagation();
}

function resizeMove(e: PointerEvent, re: NoteEditEvent) {
  const deltaX = e.clientX - re.start.downX;
  const deltaPulses = Math.floor(re.target.clip.detailedViewport.pxToPulses(deltaX));

  const selectedNotes = re.target.clip.selectedNotes;
  const targetNote = re.target.note;

  if (selectedNotes.has(targetNote)) {
    for (const note of re.target.clip.selectedNotes) {
      note.duration = Math.max(NOTE_MIN_SIZE_PULSES, re.original[2] + deltaPulses);
    }
  } else {
    // idea: should resizeDown select this note, so we always rezise on a selected note?
    targetNote.duration = Math.max(NOTE_MIN_SIZE_PULSES, re.original[2] + deltaPulses);
  }
}

function resizeUp(e: PointerEvent, re: NoteEditEvent) {
  const start = re.target.note.tick;
  const end = start + re.target.note.duration;
  const pitch = re.target.note.number;

  // remove overlaps
  const overlaps = midiClip.findNotesInRange(re.target.clip, start, end, pitch, pitch);
  for (const note of overlaps) {
    if (note === re.target.note) {
      continue;
    }
    midiBuffer.removeNote(re.target.clip.buffer, note);
  }
}

/** MOVING */

function moveDown(e: PointerEvent, re: NoteEditStartEvent) {
  // so it doesn't reach other handlers. it's causing very obvious problems for some reason
  e.preventDefault();
  e.stopPropagation();

  // const selectAdd = e.metaKey || e.shiftKey;
  // if (!selectAdd) {
  //   re.target.clip.selectedNotes.clear();
  // }

  re.target.clip.selectedNotes.clear();
  re.target.clip.selectedNotes.add(re.target.note);

  if (re.target.project.hearNotes.get()) {
    midiTrack.noteOn(re.target.track, re.original[1]);
  }
}

function moveMove(e: PointerEvent, re: NoteEditEvent) {
  const deltaX = e.clientX - re.start.downX;
  const deltaY = e.clientY - re.start.downY;
  const deltaXPulses = Math.floor(re.target.clip.detailedViewport.pxToPulses(deltaX));
  const deltaYNotes = Math.floor(re.target.clip.detailedViewport.pxToVerticalNotes(deltaY));

  // for (const note of selection.notes) {
  //   const orig = interactionDataRef.current.notes.get(note);
  //   if (orig == null) {
  //     console.warn("no original note when moving");
  //     break;
  //   }
  // }

  const selectedNotes = re.target.clip.selectedNotes;
  const targetNote = re.target.note;

  if (selectedNotes.has(targetNote)) {
    for (const note of re.target.clip.selectedNotes) {
      note.tick = re.original[0] + deltaXPulses; // todo: limits
      note.number = re.original[1] - deltaYNotes; // todo: limits
      // clip.buffer.clearCache();

      // note.tick = Math.max(NOTE_MIN_SIZE_PULSES, re.original[0] + deltaPulses);
    }
  } else {
    targetNote.tick = re.original[0] + deltaXPulses; // todo: limits
    targetNote.number = re.original[1] - deltaYNotes; // todo: limits
    // idea: should moveDown select this note, so we always rezise on a selected note?
    // targetNote.tick = Math.max(NOTE_MIN_SIZE_PULSES, re.original[0] + deltaPulses);
  }
}

function moveUp(e: PointerEvent, re: NoteEditEvent) {
  const start = re.target.note.tick;
  const end = start + re.target.note.duration - 1;
  const pitch = re.target.note.number;

  // remove overlaps
  const overlaps = midiClip.findNotesInRange(re.target.clip, start, end, pitch, pitch);
  for (const note of overlaps) {
    if (note === re.target.note) {
      continue;
    }
    midiBuffer.removeNote(re.target.clip.buffer, note);
  }

  if (re.target.project.hearNotes.get()) {
    midiTrack.noteOff(re.target.track, re.original[1]);
  }
}
