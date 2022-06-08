import { useEffect } from "react";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { AudioProject, ProjectSelection } from "../lib/AudioProject";
import { AudioRenderer } from "../lib/AudioRenderer";
import { useLinkedState } from "../lib/state/LinkedState";

export function useAppProjectKeyboardEvents(
  project: AudioProject,
  player: AnalizedPlayer,
  renderer: AudioRenderer
): void {
  const [, setTool] = useLinkedState(project.pointerTool);
  const [, setRenameState] = useLinkedState(project.currentlyRenaming);
  const [selected] = useLinkedState(project.selected);

  useEffect(() => {
    function keydownEvent(e: KeyboardEvent) {
      // console.log(e.code);
      switch (e.code) {
        case "Backspace":
          ProjectSelection.deleteSelection(project, player);
          break;
      }
    }

    function keyupEvent(_e: KeyboardEvent) {}

    function keypressEvent(e: KeyboardEvent) {
      switch (e.code) {
        case "KeyM":
          setTool("move");
          document.body.style.cursor = "auto";
          break;
        case "KeyS":
          setTool("trimStart");
          document.body.style.cursor = "e-resize";
          break;
        case "KeyE":
          setTool("trimEnd");
          document.body.style.cursor = "w-resize";
          break;

        case "Enter": {
          if (selected?.status !== "tracks") {
            break;
          }
          // Rename
          setRenameState({
            status: "track",
            track: selected.tracks[0],
          });
          break;
        }
        default:
          console.log(e.code);
      }
      if (e.code === "Space") {
        // todo: is there better way to prevent space from toggling the last
        // pressed button?
        if (document.activeElement instanceof HTMLButtonElement) {
          (document.activeElement as any).blur();
        }
        AudioRenderer.togglePlayback(renderer, project, player);
        e.preventDefault();
      }
    }

    document.addEventListener("keydown", keydownEvent);
    document.addEventListener("keypress", keypressEvent);
    document.addEventListener("keyup", keyupEvent);
    return function () {
      document.removeEventListener("keydown", keydownEvent);
      document.removeEventListener("keypress", keypressEvent);
      document.removeEventListener("keyup", keyupEvent);
    };
  }, [player, project, renderer, selected, setRenameState, setTool]);
}