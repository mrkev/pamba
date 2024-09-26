import classNames from "classnames";
import { useCallback, useRef } from "react";
import { createUseStyles } from "react-jss";
import { usePrimitive } from "structured-state";
import { AudioProject } from "../lib/project/AudioProject";
import { useLinkedState } from "../lib/state/LinkedState";
import { Note } from "../midi/SharedMidiTypes";
import { MidiViewport } from "./AudioViewport";
import { useEventListener } from "./useEventListener";
import { pressedState } from "../pressedState";
import { modifierState } from "../ModifierState";
import { MidiClip } from "../midi/MidiClip";

export function NoteR({
  clip,
  note,
  viewport,
  project,
}: {
  clip: MidiClip;
  note: Note;
  viewport: MidiViewport;
  project: AudioProject;
}) {
  const styles = useStyles();
  const [secondarySel] = useLinkedState(project.secondarySelection);
  const [noteHeight] = usePrimitive(viewport.pxNoteHeight);
  const divRef = useRef<HTMLDivElement>(null);
  const [panelTool] = usePrimitive(project.panelTool);

  const [tick, num, duration, velocity] = note;
  const selected = secondarySel?.status === "notes" && secondarySel.notes.has(note);

  useEventListener(
    "mousedown",
    divRef,
    useCallback(
      (e: MouseEvent) => {
        if (e.button !== 0) {
          return;
        }

        // if (editable === true)
        switch (panelTool) {
          case "draw": {
            MidiClip.removeNote(clip, note);
            break;
          }
          case "move": {
            project.secondarySelection.set({ status: "notes", notes: new Set([note]) });
            pressedState.set({
              status: "moving_notes",
              clientX: e.clientX,
              clientY: e.clientY,
              notes: new Set([note]),
            });
            project.secondarySelection.setDyn((prev) => {
              const selectAdd = modifierState.meta || modifierState.shift;
              if (selectAdd && prev !== null && prev.status === "notes") {
                prev.notes.add(note);
                return { ...prev };
              } else {
                return {
                  status: "notes",
                  notes: new Set([note]),
                };
              }
            });
            document.addEventListener("mousemove", onNoteMoveMouseMove);
            document.addEventListener("mouseup", function onMouseUp() {
              pressedState.set(null);
              document.removeEventListener("mouseup", onMouseUp);
              document.removeEventListener("mousemove", onNoteMoveMouseMove);
            });
            break;
          }
        }

        function onNoteMoveMouseMove(e: MouseEvent) {
          // pressedState.set(null);

          const pressed = pressedState.get();
          if (!pressed || pressed.status != "moving_notes") {
            return;
          }
          const deltaX = e.clientX - pressed.clientX;
          const deltaY = e.clientY - pressed.clientY;

          const deltaXPulses = Math.floor(clip.detailedViewport.pxToPulses(deltaX));
          const deltaYNotes = Math.floor(clip.detailedViewport.pxToVerticalNotes(deltaY));

          console.log("moving", deltaXPulses);
        }
      },
      [clip, note, panelTool, project.secondarySelection],
    ),
  );

  return (
    <div
      ref={divRef}
      className={classNames(styles.note, selected && styles.noteSelected)}
      style={{
        bottom: num * noteHeight - 1,
        height: noteHeight + 1,
        left: viewport.pulsesToPx(tick),
        width: viewport.pulsesToPx(duration) + 1,
        overflow: "hidden",
        opacity: velocity / 100,
      }}
    ></div>
  );
}

export const useStyles = createUseStyles({
  note: {
    position: "absolute",
    background: "red",
    border: "1px solid #bb0000",
    boxSizing: "border-box",
  },
  noteSelected: {
    background: "green",
  },
});
