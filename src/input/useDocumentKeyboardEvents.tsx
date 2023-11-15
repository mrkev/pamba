import { useEffect } from "react";
import { history } from "structured-state";
import { AnalizedPlayer } from "../lib/AnalizedPlayer";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioRenderer } from "../lib/AudioRenderer";
import { ProjectPersistance } from "../lib/ProjectPersistance";
import { AudioProject, ProjectSelection } from "../lib/project/AudioProject";
import { doPaste } from "../lib/project/ClipboardState";
import { MidiTrack } from "../midi/MidiTrack";
import { ignorePromise } from "../utils/ignorePromise";
import { CommandBlock } from "./Command";

export const documentCommands = CommandBlock.create((command) => {
  return {
    // Document

    save: command(["KeyS", "meta"], (e, project) => {
      ignorePromise(ProjectPersistance.doSave(project));
      ignorePromise(appEnvironment.localFiles.saveProject(project));
      e?.preventDefault();
      e?.stopPropagation();
    }),

    undo: command(["KeyZ", "meta"], (e) => {
      performance.mark("undo-start");
      history.pop();
      performance.mark("undo-end");
      performance.measure("undo", "undo-start", "undo-end");
      e?.preventDefault();
    }),

    // Clipboard

    copySelection: command(["KeyC", "meta"], (e, project) => {
      ProjectSelection.copySelection(project);
      e?.preventDefault();
    }).helptext("Copy", "Currently works only with clips"),

    pasteClipboard: command(["KeyV", "meta"], (e, project) => {
      doPaste(project);
      e?.preventDefault();
    }).helptext("Paste", "Currently works only with clips"),

    // Tool selection

    // todo: alias KeyM?
    moveTool: command(["KeyV"], (e, project) => {
      project.pointerTool.set("move");
      document.body.style.cursor = "auto";
    }),

    trimStartTool: command(["KeyS", "shift"], (e, project) => {
      project.pointerTool.set("trimStart");
      document.body.style.cursor = "e-resize";
    }),

    trimEndTool: command(["KeyE", "shift"], (e, project) => {
      project.pointerTool.set("trimEnd");
      document.body.style.cursor = "w-resize";
    }),

    sliceTool: command(["KeyS"], (e, project) => {
      project.pointerTool.set("slice");
      document.body.style.cursor = "crosshair";
    }),
  };
});

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

      const executed = documentCommands.execByKeyboardEvent(e, project);
      if (executed) {
        // console.log("Executed command!");
        return;
      }

      switch (e.code) {
        case "Backspace":
          ProjectSelection.deleteSelection(project, player);
          e.preventDefault();
          break;

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
