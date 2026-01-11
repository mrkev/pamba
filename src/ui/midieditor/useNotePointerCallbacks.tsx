import { useCallback, useRef } from "react";
import { history } from "structured-state";
import { AudioProject, SecondaryTool } from "../../lib/project/AudioProject";
import { MidiClip } from "../../midi/MidiClip";
import { MidiNote } from "../../midi/MidiNote";
import { MidiTrack } from "../../midi/MidiTrack";
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
  const interactionDataRef = useRef<{ notes: Map<MidiNote, [number, number]> }>({ notes: new Map() });

  const mouseDownForDraw = useCallback(
    (note: MidiNote) => {
      history.record("delete note", () => {
        MidiClip.removeNote(clip, note);
        track.flushClipStateToProcessor();
      });
    },
    [clip, track],
  );

  const mouseDownForMove = useCallback(
    (note: MidiNote) => {
      const prev = project.secondarySelection.get();
      console.log("HERE");
      const selectAdd = modifierState.meta || modifierState.shift;
      if (selectAdd && prev !== null && prev.status === "notes") {
        prev.notes.add(note);
        interactionDataRef.current.notes.set(note, [note.tick, note.number]);
        project.secondarySelection.set({ ...prev });
      } else {
        interactionDataRef.current.notes.set(note, [note.tick, note.number]);
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
    (e: PointerEvent, note: MidiNote) => {
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
    (e: PointerEvent, note: MidiNote, meta: { downX: number; downY: number }) => {
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
        note.tick = orig[0] + deltaXPulses;
        note.number = orig[1] - deltaYNotes;
        clip.buffer.clearCache();
      }

      return { notes: null };
    },
    [clip, project.secondarySelection],
  );

  return { onNotePointerDown, onNotePointerMove, onNotePointerUp };
}
