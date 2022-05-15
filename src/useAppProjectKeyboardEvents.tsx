import { useEffect } from "react";
import { AnalizedPlayer } from "./AnalizedPlayer";
import { AudioProject } from "./lib/AudioProject";
import { useLinkedState } from "./lib/LinkedState";

export function useAppProjectKeyboardEvents(
  project: AudioProject,
  player: AnalizedPlayer,
  togglePlayback: () => void
): void {
  const [, setTool] = useLinkedState(project.pointerTool);
  const [selected, setSelected] = useLinkedState(project.selected);

  useEffect(() => {
    function keydownEvent(e: KeyboardEvent) {
      // console.log(e.code);
      switch (e.code) {
        case "Backspace":
          if (!selected) {
            return;
          }
          if (selected.status === "clips") {
            for (let { clip, track } of selected.clips) {
              console.log("remove", selected);
              AudioProject.removeClip(project, track, clip);
              setSelected(null);
            }
          }
          if (selected.status === "tracks") {
            for (let track of selected.tracks) {
              console.log("remove", selected);
              AudioProject.removeTrack(project, player, track);
              setSelected(null);
            }
          }
          if (selected.status === "time") {
            // todo
          }

          // console.log(selectionWidthRef.current);
          break;
      }
    }

    function keyupEvent(e: KeyboardEvent) {}

    function keypressEvent(e: KeyboardEvent) {
      switch (e.code) {
        case "KeyM":
          setTool("move");
          break;
        case "KeyS":
          setTool("trimStart");
          break;
        case "KeyE":
          setTool("trimEnd");
          break;
        default:
          console.log(e.code);
      }
      if (e.code === "Space") {
        // todo: is there better way to prevent space from toggling the last
        // pressed button?
        if (document.activeElement instanceof HTMLButtonElement) {
          (document.activeElement as any).blur();
        }
        togglePlayback();
        e.preventDefault();
      }
    }

    document.addEventListener("keydown", keydownEvent);
    document.addEventListener("keypress", keypressEvent, { capture: true });
    document.addEventListener("keyup", keyupEvent);
    return function () {
      document.removeEventListener("keydown", keydownEvent);
      document.removeEventListener("keypress", keypressEvent, { capture: true });
      document.removeEventListener("keyup", keyupEvent);
    };
  }, [player, project, selected, setSelected, setTool, togglePlayback]);
}
