import { useEffect } from "react";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { AudioProject, ProjectSelection } from "../lib/AudioProject";
import { AudioRenderer } from "../lib/AudioRenderer";
import { useLinkedState } from "../lib/LinkedState";

export function useAppProjectKeyboardEvents(
  project: AudioProject,
  player: AnalizedPlayer,
  renderer: AudioRenderer
): void {
  const [, setTool] = useLinkedState(project.pointerTool);

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
        AudioRenderer.togglePlayback(renderer, project, player);
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
  }, [player, project, renderer, setTool]);
}
