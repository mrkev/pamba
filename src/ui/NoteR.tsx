import classNames from "classnames";
import { useLinkAsState } from "marked-subbable";
import { useCallback, useRef } from "react";
import { history, usePrimitive, useSubscribeToSubbableMutationHashable } from "structured-state";
import { AudioProject } from "../lib/project/AudioProject";
import { MidiViewport } from "../lib/viewport/MidiViewport";
import { MidiClip } from "../midi/MidiClip";
import { MidiTrack } from "../midi/MidiTrack";
import { Note } from "../midi/SharedMidiTypes";
import { exhaustive } from "../utils/exhaustive";
import { modifierState } from "./ModifierState";
import { usePointerPressMove } from "./usePointerPressMove";

export function NoteR({
  track,
  clip,
  note,
  viewport,
  project,
}: {
  note: Note;
  clip: MidiClip;
  track: MidiTrack;
  viewport: MidiViewport;
  project: AudioProject;
}) {
  const [secondarySel] = useLinkAsState(project.secondarySelection);
  const [noteHeight] = usePrimitive(viewport.pxNoteHeight);
  const divRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<{ notes: Map<Note, [number, number]> }>({ notes: new Map() });
  const [panelTool] = usePrimitive(project.panelTool);

  const [tick, num, duration, velocity] = note;
  const selected = secondarySel?.status === "notes" && secondarySel.notes.has(note);

  useSubscribeToSubbableMutationHashable(clip);

  const mouseDownForDraw = useCallback(() => {
    history.record("delete note", () => {
      MidiClip.removeNote(clip, note);
      track.flushClipStateToProcessor();
    });
  }, [clip, note, track]);

  usePointerPressMove(divRef, {
    down: useCallback(
      (e: PointerEvent) => {
        console.log("mousedown: noter");
        if (e.button !== 0) {
          return;
        }

        switch (panelTool) {
          case "draw": {
            return mouseDownForDraw();
          }

          case "move": {
            const prev = project.secondarySelection.get();
            const selectAdd = modifierState.meta || modifierState.shift;
            if (selectAdd && prev !== null && prev.status === "notes") {
              prev.notes.add(note);
              project.secondarySelection.set({ ...prev });
            } else {
              dataRef.current.notes.set(note, [note[0], note[1]]);
              project.secondarySelection.set({
                status: "notes",
                notes: new Set([note]),
              });
              return;
            }

            break;
          }
          default:
            exhaustive(panelTool);
        }
      },
      [mouseDownForDraw, note, panelTool, project.secondarySelection],
    ),

    up: useCallback(() => {
      dataRef.current.notes.clear();
    }, []),

    move: useCallback(
      (e: PointerEvent, meta: { downX: number; downY: number }) => {
        console.log("mouse: noter", meta, e);

        const selection = project.secondarySelection.get();
        if (selection?.status !== "notes") {
          return;
        }

        const deltaX = e.clientX - meta.downX;
        const deltaY = e.clientY - meta.downY;

        const deltaXPulses = Math.floor(clip.detailedViewport.pxToPulses(deltaX));
        const deltaYNotes = Math.floor(clip.detailedViewport.pxToVerticalNotes(deltaY));

        for (const note of selection.notes) {
          const orig = dataRef.current.notes.get(note);
          if (orig == null) {
            console.warn("no original note when moving");
            break;
          }
          note[0] = orig[0] + deltaXPulses;
          note[1] = orig[1] - deltaYNotes;
          clip.buffer.clearCache();
          clip.notifyChange();

          console.log("note now at", note);

          // MidiClip.removeNote(clip, note);
          // const [tick, num, duration, velocity] = note;
          // MidiClip.addNote(clip, tick + deltaXPulses, num - deltaYNotes, duration, velocity);
        }

        return { notes: null };
      },
      [clip, project.secondarySelection],
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
