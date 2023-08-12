import { useEffect } from "react";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { AudioProject, ProjectSelection } from "../lib/project/AudioProject";
import { ProjectPersistance } from "../lib/ProjectPersistance";
import { AudioRenderer } from "../lib/AudioRenderer";
import { ignorePromise } from "../utils/ignorePromise";
import { appEnvironment } from "../lib/AppEnvironment";

export function useAppProjectKeyboardEvents(
  project: AudioProject,
  player: AnalizedPlayer,
  renderer: AudioRenderer
): void {
  useEffect(() => {
    function keydownEvent(e: KeyboardEvent) {
      // TODO: also, on top of of doing this to prevent keyboard events when typing on forms
      // make the UI modal so events don't happen when modal dialogs are open for example
      if (e.target instanceof HTMLInputElement) {
        return;
      }
      // console.log(e.code);
      switch (e.code) {
        case "Backspace":
          ProjectSelection.deleteSelection(project, player);
          break;

        case "KeyS": {
          if (e.metaKey) {
            ignorePromise(ProjectPersistance.doSave(project));
            e.preventDefault();
            e.stopPropagation();
          }
          break;
        }
      }
    }

    function keyupEvent(_e: KeyboardEvent) {}

    function keypressEvent(e: KeyboardEvent) {
      // TODO: also, on top of of doing this to prevent keyboard events when typing on forms
      // make the UI modal so events don't happen when modal dialogs are open for example
      if (e.target instanceof HTMLInputElement) {
        return;
      }
      switch (e.code) {
        case "KeyM":
          project.pointerTool.set("move");
          document.body.style.cursor = "auto";
          break;
        case "KeyS": {
          project.pointerTool.set("trimStart");
          document.body.style.cursor = "e-resize";
          break;
        }
        case "KeyE":
          project.pointerTool.set("trimEnd");
          document.body.style.cursor = "w-resize";
          break;

        case "Enter": {
          const selected = project.selected.get();
          if (selected?.status !== "tracks") {
            break;
          }
          // Rename
          appEnvironment.currentlyRenaming.set({
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
  }, [player, project, renderer]);
}
