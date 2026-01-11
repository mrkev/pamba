import classNames from "classnames";
import { useCallback, useMemo, useRef } from "react";
import { useContainer, usePrimitive, useSubscribeToSubbableMutationHashable } from "structured-state";
import { AudioProject } from "../lib/project/AudioProject";
import { MidiClip } from "../midi/MidiClip";
import { MidiNote } from "../midi/MidiNote";
import { MidiTrack } from "../midi/MidiTrack";
import { PointerPressMeta, usePointerPressMove } from "./usePointerPressMove";

export type NoteCtx = Readonly<{ note: MidiNote; clip: MidiClip; track: MidiTrack; project: AudioProject }>;

export function NoteR({
  note,
  clip,
  track,
  project,
  selected,
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
  className?: string;
  style?: React.CSSProperties;
  onPointerDown: (e: PointerEvent, ctx: NoteCtx) => void;
  onPointerMove: (e: PointerEvent, meta: PointerPressMeta, ctx: NoteCtx) => void;
  onPointerUp: (e: PointerEvent, meta: PointerPressMeta, ctx: NoteCtx) => void;
}) {
  const [noteHeight] = usePrimitive(clip.detailedViewport.pxNoteHeight);
  const divRef = useRef<HTMLDivElement>(null);
  const mnote = useContainer(note);
  const [tick, num, duration, velocity] = mnote.t;

  const ctx = useMemo(() => ({ note, clip, track, project }), [clip, note, project, track]);

  useSubscribeToSubbableMutationHashable(clip);

  usePointerPressMove(divRef, {
    down: useCallback((e: PointerEvent) => onPointerDown(e, ctx), [ctx, onPointerDown]),
    up: useCallback((e: PointerEvent, meta: PointerPressMeta) => onPointerUp(e, meta, ctx), [ctx, onPointerUp]),
    move: useCallback((e: PointerEvent, meta: PointerPressMeta) => onPointerMove(e, meta, ctx), [ctx, onPointerMove]),
  });

  return (
    <div
      ref={divRef}
      className={classNames(
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
    ></div>
  );
}
