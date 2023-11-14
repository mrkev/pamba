import { useEffect } from "react";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { AudioRenderer } from "../lib/AudioRenderer";
import { ProjectPersistance } from "../lib/ProjectPersistance";
import { AudioProject, ProjectSelection } from "../lib/project/AudioProject";
import { MidiTrack } from "../midi/MidiTrack";
import { ignorePromise } from "../utils/ignorePromise";
import { doPaste } from "../lib/project/ClipboardState";
import { appEnvironment } from "../lib/AppEnvironment";
import { undo } from "structured-state";

export function useDocumentKeyboardEvents(
  project: AudioProject,
  player: AnalizedPlayer,
  renderer: AudioRenderer,
): void {
  useEffect(() => {
    function keydownEvent(e: KeyboardEvent) {
      // TODO: also, on top of of doing this to prevent keyboard events when typing on forms
      // make the UI modal so events don't happen when modal dialogs are open for example
      if (e.target instanceof HTMLInputElement) {
        return;
      }

      switch (e.code) {
        case "Backspace":
          ProjectSelection.deleteSelection(project, player);
          e.preventDefault();
          break;

        case "KeyC":
          ProjectSelection.copySelection(project);
          e.preventDefault();
          break;

        case "KeyV":
          doPaste(project);
          e.preventDefault();
          break;

        case "KeyZ":
          if (e.metaKey) {
            undo();
            e.preventDefault();
          }
          break;
        case "KeyS": {
          if (e.metaKey) {
            ignorePromise(ProjectPersistance.doSave(project));
            ignorePromise(appEnvironment.localFiles.saveProject(project));
            e.preventDefault();
            e.stopPropagation();
          }
          break;
        }

        case "KeyM": {
          const activeTrack = project.activeTrack.get();
          if (e.ctrlKey && e.shiftKey && activeTrack instanceof MidiTrack) {
            activeTrack.createSampleMidiClip();
          }
          break;
        }

        case "KeyT": {
          if (e.ctrlKey && e.shiftKey) {
            ignorePromise(AudioProject.addMidiTrack(project));
            e.preventDefault();
          } else if (e.ctrlKey) {
            AudioProject.addAudioTrack(project, player);
            e.preventDefault();
          }
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
          // Rename TODO. Can probably be done with some focus event listener?
          // appEnvironment.currentlyRenaming.set({
          //   status: "track",
          //   track: selected.tracks[0],
          // });
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
