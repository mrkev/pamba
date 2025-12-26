import classNames from "classnames";
import { useCallback, useRef } from "react";
import { usePrimitive, useSubscribeToSubbableMutationHashable } from "structured-state";
import { MidiViewport } from "../lib/viewport/MidiViewport";
import { MidiClip } from "../midi/MidiClip";
import { Note } from "../midi/SharedMidiTypes";
import { PointerPressMoveMeta, usePointerPressMove } from "./usePointerPressMove";

export function NoteR({
  clip,
  note,
  viewport,
  selected,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  note: Note;
  clip: MidiClip;
  viewport: MidiViewport;
  selected: boolean;
  onPointerDown: (e: PointerEvent, note: Note) => void;
  onPointerMove: (e: PointerEvent, note: Note, meta: PointerPressMoveMeta) => void;
  onPointerUp: (e: PointerEvent, note: Note, meta: PointerPressMoveMeta) => void;
}) {
  const [noteHeight] = usePrimitive(viewport.pxNoteHeight);
  const divRef = useRef<HTMLDivElement>(null);
  const [tick, num, duration, velocity] = note;

  useSubscribeToSubbableMutationHashable(clip);

  usePointerPressMove(divRef, {
    down: useCallback((e: PointerEvent) => onPointerDown(e, note), [note, onPointerDown]),
    up: useCallback((e: PointerEvent, meta: PointerPressMoveMeta) => onPointerUp(e, note, meta), [note, onPointerUp]),
    move: useCallback(
      (e: PointerEvent, meta: { downX: number; downY: number }) => onPointerMove(e, note, meta),
      [note, onPointerMove],
    ),
  });

  return (
    <div
      ref={divRef}
      className={classNames(
        "absolute bg-midi-note border border-midi-note-border box-border overflow-hidden",
        selected && "bg-midi-note-selected",
      )}
      style={{
        bottom: num * noteHeight - 1,
        left: viewport.pulsesToPx(tick),
        height: noteHeight + 1,
        width: viewport.pulsesToPx(duration) + 1,
        opacity: velocity / 100,
      }}
    ></div>
  );
}
