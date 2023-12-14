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
import { LIBRARY_SEARCH_INPUT_ID } from "../constants";
import { flushSync } from "react-dom";

export const documentCommands = CommandBlock.create((command) => {
  return {
    // Document

    // need async
    // new:
    // open:

    save: command(["KeyS", "meta"], async (e, project) => {
      e?.preventDefault();
      e?.stopPropagation();
      return ProjectPersistance.doSave(project);
    }).helptext("Save"),

    // TODO: save as/save copy
    // TODO: split at cursor

    undo: command(["KeyZ", "meta"], (e) => {
      performance.mark("undo-start");
      history.pop();
      performance.mark("undo-end");
      performance.measure("undo", "undo-start", "undo-end");
      e?.preventDefault();
    }).helptext("Undo", "Note: EXPERIMENTAL!"),

    createAudioTrack: command(["KeyT", "ctrl"], (e, project) => {
      // TODO: history
      AudioProject.addAudioTrack(project, appEnvironment.renderer.analizedPlayer);
      e?.preventDefault();
    }).helptext("New Audio Track"),

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

    jumpToTimelineStart: command(["ArrowLeft", "alt"], (e, project) => {
      project.cursorPos.set(0);
      project.selectionWidth.set(0);
      e?.preventDefault();
    }).helptext("Jump to start", "Rewinds the cursor to the beggining of the track"),

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
    }).helptext("Select Move Tool", "Base tool. Selects, moves, etc"),

    trimStartTool: command(["KeyS", "shift"], (e, project) => {
      project.pointerTool.set("trimStart");
      document.body.style.cursor = "e-resize";
    }).helptext("Select Trim-Start tool", "On click trims click to start at selected time"),

    trimEndTool: command(["KeyE", "shift"], (e, project) => {
      project.pointerTool.set("trimEnd");
      document.body.style.cursor = "w-resize";
    }).helptext("Select Trim-End tool", "On click trims click to end at selected time"),

    sliceTool: command(["KeyS"], (e, project) => {
      project.pointerTool.set("slice");
      document.body.style.cursor = "crosshair";
    }).helptext("Select Slice tool", "On click splits clips at selected time"),

    // Panels

    toggleLibrary: command(["KeyL"], () => {
      if (appEnvironment.activeSidePanel.get() === "library") {
        appEnvironment.activeSidePanel.set(null);
      } else {
        appEnvironment.activeSidePanel.set("library");
      }
    }).helptext("Toggle Library", "Show/Hide library on side panel"),

    toggleEditor: command(["Period"], () => {
      if (appEnvironment.activeBottomPanel.get() === "editor") {
        appEnvironment.activeBottomPanel.set(null);
      } else {
        appEnvironment.activeBottomPanel.set("editor");
      }
    }).helptext("Toggle Details", "Show/Hide details on bottom panel"),

    findInLibrary: command(["KeyF", "meta"], (e) => {
      flushSync(() => {
        appEnvironment.activeSidePanel.set("library");
      });
      document.getElementById(LIBRARY_SEARCH_INPUT_ID)?.focus();
      e?.preventDefault();
    }),

    // Debugging

    createSampleProject: command(["KeyS", "meta", "shift"], async () => {
      const project = await ProjectPersistance.sampleProject();
      appEnvironment.projectStatus.set({
        status: "loaded",
        project,
      });
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
