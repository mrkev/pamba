import classNames from "classnames";
import { useCallback, useRef } from "react";
import { createUseStyles } from "react-jss";
import { history, usePrimitive } from "structured-state";
import { modifierState } from "./ModifierState";
import { AudioProject } from "../lib/project/AudioProject";
import { useLinkedState } from "../lib/state/LinkedState";
import { MidiViewport } from "../lib/viewport/MidiViewport";
import { MidiClip } from "../midi/MidiClip";
import { MidiTrack } from "../midi/MidiTrack";
import { Note } from "../midi/SharedMidiTypes";
import { exhaustive } from "../utils/exhaustive";
import { useMousePressMove } from "./useEventListener";

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
  const styles = useStyles();
  const [secondarySel] = useLinkedState(project.secondarySelection);
  const [noteHeight] = usePrimitive(viewport.pxNoteHeight);
  const divRef = useRef<HTMLDivElement>(null);
  const [panelTool] = usePrimitive(project.panelTool);

  const [tick, num, duration, velocity] = note;
  const selected = secondarySel?.status === "notes" && secondarySel.notes.has(note);

  useMousePressMove(
    divRef,
    useCallback(
      (e) => {
        console.log("mousedown: noter");
        if (e.button !== 0) {
          return "done";
        }

        // if (editable === true)
        switch (panelTool) {
          case "draw": {
            history.record("delete note", () => {
              MidiClip.removeNote(clip, note);
              track.flushClipStateToProcessor();
            });
            return "done";
          }

          case "move": {
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

            // info to keep for the other events
            return {
              clientX: e.clientX,
              clientY: e.clientY,
              notes: new Set([note]),
            };
          }
          default:
            exhaustive(panelTool);
        }
      },
      [clip, note, panelTool, project.secondarySelection, track],
    ),
    useCallback(
      (meta, e) => {
        console.log("mouse: noter", meta, e);

        switch (meta.event) {
          case "mouseenter":
          case "mouseleave":
          case "mousemove":
          case "mouseup":
            break;
          default:
            exhaustive(meta.event);
        }

        // pressedState.set(null);

        // const pressed = pressedState.get();
        // if (!pressed || pressed.status != "moving_notes") {
        //   return;
        // }
        const deltaX = e.clientX - meta.mousedown.clientX;
        // const deltaY = e.clientY - meta.mousedown.clientY;

        const deltaXPulses = Math.floor(clip.detailedViewport.pxToPulses(deltaX));
        // const deltaYNotes = Math.floor(clip.detailedViewport.pxToVerticalNotes(deltaY));

        console.log("moving", deltaXPulses);
      },
      [clip.detailedViewport],
    ),
  );

  // useEventListener(
  //   "mousedown",
  //   divRef,
  //   useCallback(
  //     (e: MouseEvent) => {
  //       if (e.button !== 0) {
  //         return;
  //       }

  //       // if (editable === true)
  //       switch (panelTool) {
  //         case "draw": {
  //           MidiClip.removeNote(clip, note);
  //           break;
  //         }
  //         case "move": {
  //           project.secondarySelection.set({ status: "notes", notes: new Set([note]) });
  //           pressedState.set({
  //             status: "moving_notes",
  //             clientX: e.clientX,
  //             clientY: e.clientY,
  //             notes: new Set([note]),
  //           });
  //           project.secondarySelection.setDyn((prev) => {
  //             const selectAdd = modifierState.meta || modifierState.shift;
  //             if (selectAdd && prev !== null && prev.status === "notes") {
  //               prev.notes.add(note);
  //               return { ...prev };
  //             } else {
  //               return {
  //                 status: "notes",
  //                 notes: new Set([note]),
  //               };
  //             }
  //           });
  //           document.addEventListener("mousemove", onNoteMoveMouseMove);
  //           document.addEventListener("mouseup", function onMouseUp() {
  //             pressedState.set(null);
  //             document.removeEventListener("mouseup", onMouseUp);
  //             document.removeEventListener("mousemove", onNoteMoveMouseMove);
  //           });
  //           break;
  //         }
  //       }

  //       function onNoteMoveMouseMove(e: MouseEvent) {
  //         // pressedState.set(null);

  //         const pressed = pressedState.get();
  //         if (!pressed || pressed.status != "moving_notes") {
  //           return;
  //         }
  //         const deltaX = e.clientX - pressed.clientX;
  //         const deltaY = e.clientY - pressed.clientY;

  //         const deltaXPulses = Math.floor(clip.detailedViewport.pxToPulses(deltaX));
  //         const deltaYNotes = Math.floor(clip.detailedViewport.pxToVerticalNotes(deltaY));

  //         console.log("moving", deltaXPulses);
  //       }
  //     },
  //     [clip, note, panelTool, project.secondarySelection],
  //   ),
  // );

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
