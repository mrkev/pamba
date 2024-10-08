import { useEffect } from "react";
import { AudioProject } from "../lib/project/AudioProject";
import { MidiTrack } from "../midi/MidiTrack";
import { documentCommands } from "./documentCommands";

export function useDocumentKeyboardEvents(project: AudioProject): void {
  useEffect(() => {
    function keydownEvent(e: KeyboardEvent) {
      // console.log("Doc keydown", e.code);
      // TODO: also, on top of of doing this to prevent keyboard events when typing on forms
      // make the UI modal so events don't happen when modal dialogs are open for example
      if (e.target instanceof HTMLInputElement) {
        return;
      }

      const executed = documentCommands.execByKeyboardEvent(e, project);
      if (executed) {
        // console.log("Executed comand!");
        return;
      }

      switch (e.code) {
        case "KeyM": {
          const activeTrack = project.activeTrack.get();
          if (e.ctrlKey && e.shiftKey && activeTrack instanceof MidiTrack) {
            activeTrack.createSampleMidiClip();
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
        // console.log(e.code);
      }
      // if (e.code === "Space") {
      //   // todo: is there better way to prevent space from toggling the last
      //   // pressed button?
      //   if (document.activeElement instanceof HTMLButtonElement) {
      //     (document.activeElement as any).blur();
      //   }
      //   AudioRenderer.togglePlayback(renderer, project, player);
      //   e.preventDefault();
      // }
    }

    document.addEventListener("keydown", keydownEvent);
    document.addEventListener("keypress", keypressEvent);
    document.addEventListener("keyup", keyupEvent);
    return function () {
      document.removeEventListener("keydown", keydownEvent);
      document.removeEventListener("keypress", keypressEvent);
      document.removeEventListener("keyup", keyupEvent);
    };
  }, [project]);
}
