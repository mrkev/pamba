import { useCallback, useRef } from "react";
import { history } from "structured-state";
import { SecondaryTool } from "../../lib/project/AudioProject";
import { MidiClip } from "../../midi/MidiClip";
import { MidiNote } from "../../midi/MidiNote";
import { midiTrack } from "../../midi/MidiTrack";
import { exhaustive } from "../../utils/exhaustive";
import { modifierState } from "../ModifierState";
import { NoteCtx } from "../NoteR";
import { PointerPressMeta } from "../usePointerPressMove";

/**
 * Returns callbacks for moving and drawing notes
 */
export function useNotePointerCallbacks(panelTool: SecondaryTool) {
  const interactionDataRef = useRef({
    notes: new Map<MidiNote, [number, number]>(),
    playingNote: null as number | null,
  });

  const mouseDownForDraw = useCallback(({ note, clip, track }: NoteCtx) => {
    history.record("delete note", () => {
      MidiClip.removeNote(clip, note);
      track.flushClipStateToProcessor();
    });
  }, []);

  const mouseDownForMove = useCallback(({ note, track, project }: NoteCtx) => {
    if (project.hearNotes.get()) {
      midiTrack.noteOn(track, note.number);
      interactionDataRef.current.playingNote = note.number;
    }

    const prev = project.secondarySelection.get();
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
  }, []);

  //

  const onNotePointerDown = useCallback(
    (e: PointerEvent, ctx: NoteCtx) => {
      if (e.button !== 0) {
        return;
      }

      switch (panelTool) {
        case "draw":
          mouseDownForDraw(ctx);
          // we dont want the cointainer to get the pointerDown event and capture the pointer
          e.stopPropagation();
          return;
        case "move":
          mouseDownForMove(ctx);
          // we dont want the cointainer to get the pointerDown event and capture the pointer
          e.stopPropagation();
          return;
        default:
          exhaustive(panelTool);
      }
    },
    [mouseDownForDraw, mouseDownForMove, panelTool],
  );

  const onNotePointerUp = useCallback((e: PointerEvent, meta: PointerPressMeta, { track }: NoteCtx) => {
    interactionDataRef.current.notes.clear();

    const playingNote = interactionDataRef.current.playingNote;
    if (playingNote != null) {
      midiTrack.noteOff(track, playingNote);
      interactionDataRef.current.playingNote = null;
    }
  }, []);

  const onNotePointerMove = useCallback((e: PointerEvent, meta: PointerPressMeta, { clip, project }: NoteCtx) => {
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
  }, []);

  return { onNotePointerDown, onNotePointerMove, onNotePointerUp };
}
