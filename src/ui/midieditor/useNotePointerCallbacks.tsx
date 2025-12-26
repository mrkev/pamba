import { useCallback, useRef } from "react";
import { history } from "structured-state";
import { AudioProject, SecondaryTool } from "../../lib/project/AudioProject";
import { MidiClip } from "../../midi/MidiClip";
import { MidiTrack } from "../../midi/MidiTrack";
import { Note } from "../../midi/SharedMidiTypes";
import { exhaustive } from "../../utils/exhaustive";
import { modifierState } from "../ModifierState";

/**
 * Returns callbacks for moving and drawing notes
 */
export function useNotePointerCallbacks(
  panelTool: SecondaryTool,
  clip: MidiClip,
  track: MidiTrack,
  project: AudioProject,
) {
  const interactionDataRef = useRef<{ notes: Map<Note, [number, number]> }>({ notes: new Map() });

  const mouseDownForDraw = useCallback(
    (note: Note) => {
      history.record("delete note", () => {
        MidiClip.removeNote(clip, note);
        track.flushClipStateToProcessor();
      });
    },
    [clip, track],
  );

  const mouseDownForMove = useCallback(
    (note: Note) => {
      const prev = project.secondarySelection.get();
      console.log("HERE");
      const selectAdd = modifierState.meta || modifierState.shift;
      if (selectAdd && prev !== null && prev.status === "notes") {
        prev.notes.add(note);
        interactionDataRef.current.notes.set(note, [note[0], note[1]]);
        project.secondarySelection.set({ ...prev });
      } else {
        interactionDataRef.current.notes.set(note, [note[0], note[1]]);
        project.secondarySelection.set({
          status: "notes",
          notes: new Set([note]),
        });
        return;
      }
    },
    [project.secondarySelection],
  );

  const onNotePointerDown = useCallback(
    (e: PointerEvent, note: Note) => {
      if (e.button !== 0) {
        return;
      }

      switch (panelTool) {
        case "draw":
          mouseDownForDraw(note);
          // we dont want the cointainer to get the pointerDown event and capture the pointer
          e.stopPropagation();
          return;
        case "move":
          mouseDownForMove(note);
          // we dont want the cointainer to get the pointerDown event and capture the pointer
          e.stopPropagation();
          return;
        default:
          exhaustive(panelTool);
      }
    },
    [mouseDownForDraw, mouseDownForMove, panelTool],
  );

  const onNotePointerUp = useCallback(() => {
    interactionDataRef.current.notes.clear();
  }, []);

  const onNotePointerMove = useCallback(
    (e: PointerEvent, note: Note, meta: { downX: number; downY: number }) => {
      const selection = project.secondarySelection.get();
      if (selection?.status !== "notes") {
        return;
      }

      const deltaX = e.clientX - meta.downX;
      const deltaY = e.clientY - meta.downY;

      const deltaXPulses = Math.floor(clip.detailedViewport.pxToPulses(deltaX));
      const deltaYNotes = Math.floor(clip.detailedViewport.pxToVerticalNotes(deltaY));

      for (const note of selection.notes) {
        const orig = interactionDataRef.current.notes.get(note);
        if (orig == null) {
          console.warn("no original note when moving");
          break;
        }
        note[0] = orig[0] + deltaXPulses;
        note[1] = orig[1] - deltaYNotes;
        clip.buffer.clearCache();
        clip.notifyChange();
      }

      return { notes: null };
    },
    [clip, project.secondarySelection],
  );

  return { onNotePointerDown, onNotePointerMove, onNotePointerUp };
}
