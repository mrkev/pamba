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

    // need async
    // new:
    // open:

    save: command(["KeyS", "meta"], async (e, project) => {
      e?.preventDefault();
      e?.stopPropagation();
      return Promise.all([ProjectPersistance.doSave(project), appEnvironment.localFiles.saveProject(project)]);
    }),

    undo: command(["KeyZ", "meta"], (e) => {
      performance.mark("undo-start");
      history.pop();
      performance.mark("undo-end");
      performance.measure("undo", "undo-start", "undo-end");
      e?.preventDefault();
    }),

    createAudioTrack: command(["KeyT", "ctrl"], (e, project) => {
      // TODO: history
      AudioProject.addAudioTrack(project, appEnvironment.renderer.analizedPlayer);
      e?.preventDefault();
    }),

    createMidiTrack: command(["KeyT", "ctrl", "shift"], (e, project) => {
      // TODO: history
      ignorePromise(AudioProject.addMidiTrack(project));
      e?.preventDefault();
    }),

    deleteSelection: command(["Backspace"], (e, project) => {
      // TODO: history
      ProjectSelection.deleteSelection(project);
      e?.preventDefault();
    }),

    // Clipboard

    copySelection: command(["KeyC", "meta"], (e, project) => {
      ProjectSelection.copySelection(project);
      e?.preventDefault();
    }).helptext("Copy", "Currently works only with clips"),

    pasteClipboard: command(["KeyV", "meta"], (e, project) => {
      // TODO: history. how?
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
