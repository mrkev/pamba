import { history } from "structured-state";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioRenderer } from "../lib/AudioRenderer";
import { ProjectPersistance } from "../lib/ProjectPersistance";
import { AudioProject, ProjectSelection } from "../lib/project/AudioProject";
import { doPaste } from "../lib/project/ClipboardState";
import { ignorePromise } from "../utils/ignorePromise";
import { CommandBlock } from "./Command";
import { LIBRARY_SEARCH_INPUT_ID } from "../constants";
import { flushSync } from "react-dom";
import { pressedState } from "../pressedState";
import { exhaustive } from "../utils/exhaustive";

export const documentCommands = CommandBlock.create(["Project", "Edit", "Tools", "Playback"] as const, (command) => {
  return {
    // Document
    // need async
    // new:
    // open:
    save: command(["KeyS", "meta"], async (e, project) => {
      e?.preventDefault();
      e?.stopPropagation();
      return ProjectPersistance.doSave(project);
    })
      .helptext("Save")
      .section("Project"),
    // TODO: save as/save copy
    // TODO: split at cursor
    undo: command(["KeyZ", "meta"], (e) => {
      performance.mark("undo-start");
      history.pop();
      performance.mark("undo-end");
      performance.measure("undo", "undo-start", "undo-end");
      e?.preventDefault();
    })
      .helptext("Undo", "Note: EXPERIMENTAL!")
      .section("Project"),

    createAudioTrack: command(["KeyT", "ctrl"], (e, project) => {
      // TODO: history
      AudioProject.addAudioTrack(project, appEnvironment.renderer.analizedPlayer);
      e?.preventDefault();
    })
      .helptext("New Audio Track")
      .section("Project"),

    createMidiTrack: command(["KeyT", "ctrl", "shift"], (e, project) => {
      // TODO: history
      ignorePromise(AudioProject.addMidiTrack(project));
      e?.preventDefault();
    }).section("Project"),

    deleteSelection: command(["Backspace"], (e, project) => {
      // TODO: history
      ProjectSelection.deleteSelection(project);
      e?.preventDefault();
    }).section("Edit"),

    jumpToTimelineStart: command(["ArrowLeft", "alt"], (e, project) => {
      project.cursorPos.set(0);
      project.selectionWidth.set(0);
      e?.preventDefault();
    })
      .helptext("Jump to start", "Rewinds the cursor to the beggining of the track")
      .section("Playback"),

    togglePlayback: command(["Space"], (e, project) => {
      // todo: is there better way to prevent space from toggling the last
      // pressed button?
      if (document.activeElement instanceof HTMLButtonElement) {
        (document.activeElement as any).blur();
      }
      AudioRenderer.togglePlayback(appEnvironment.renderer, project, appEnvironment.renderer.analizedPlayer);
      e?.preventDefault();
    })
      .helptext("Toggle Playback")
      .section("Playback"),

    // Clipboard
    copySelection: command(["KeyC", "meta"], (e, project) => {
      ProjectSelection.copySelection(project);
      e?.preventDefault();
    })
      .helptext("Copy", "Currently works only with clips")
      .section("Edit"),

    pasteClipboard: command(["KeyV", "meta"], (e, project) => {
      // TODO: history. how?
      doPaste(project);
      e?.preventDefault();
    })
      .helptext("Paste", "Currently works only with clips")
      .section("Edit"),

    // Tool selection
    // todo: alias KeyM?
    moveTool: command(["KeyV"], (e, project) => {
      project.pointerTool.set("move");
      document.body.style.cursor = "auto";
    })
      .helptext("Select Move Tool", "Base tool. Selects, moves, etc")
      .section("Tools"),

    trimStartTool: command(["KeyS", "shift"], (e, project) => {
      project.pointerTool.set("trimStart");
      document.body.style.cursor = "e-resize";
    })
      .helptext("Select Trim-Start tool", "On click trims click to start at selected time")
      .section("Tools"),

    trimEndTool: command(["KeyE", "shift"], (e, project) => {
      project.pointerTool.set("trimEnd");
      document.body.style.cursor = "w-resize";
    })
      .helptext("Select Trim-End tool", "On click trims click to end at selected time")
      .section("Tools"),

    sliceTool: command(["KeyS"], (e, project) => {
      project.pointerTool.set("slice");
      document.body.style.cursor = "crosshair";
    })
      .helptext("Select Slice tool", "On click splits clips at selected time")
      .section("Tools"),

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

    // Other
    escape: command(["Escape"], (_, project) => {
      const pressed = pressedState.get();
      if (pressed == null) {
        return;
      }

      switch (pressed.status) {
        case "moving_clip": {
          // cancelMovingClip(pressed, project);
          break;
        }
        case "dragging_new_audio":
        case "resizing_clip":
        case "resizing_track":
        case "selecting_global_time":
        case "selecting_track_time":
          break;
        case null:
          break;
        default:
          exhaustive(pressed);
      }
    }),
  };
});
