import { flushSync } from "react-dom";
import { history } from "structured-state";
import { LIBRARY_SEARCH_INPUT_ID } from "../constants";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioRenderer } from "../lib/io/AudioRenderer";
import { ProjectSelection } from "../lib/project/ProjectSelection";
import { clipsLimits } from "../lib/project/timeline";
import { projectPersistance } from "../lib/ProjectPersistance";
import { userActions } from "../lib/userActions";
import { closeProject } from "../ui/header/closeProject";
import { pressedState } from "../ui/pressedState";
import { exhaustive } from "../utils/exhaustive";
import { nullthrows } from "../utils/nullthrows";
import { CommandBlock } from "./Command";

export const documentCommands = CommandBlock.create(["Project", "Edit", "Tools", "Playback"] as const, (command) => {
  return {
    // Document
    // need async
    // open:
    newProject: command(["KeyN", "alt", "meta"], async (e, project) => {
      e?.preventDefault();
      e?.stopPropagation();
      const didClose = await closeProject(project);
      if (!didClose) {
        return;
      }
      await projectPersistance.openEmptyProject();
    })
      .helptext("New Project")
      .section("Project"),

    save: command(["KeyS", "meta"], async (e, project) => {
      e?.preventDefault();
      e?.stopPropagation();
      return projectPersistance.doSave(project);
    })
      .helptext("Save")
      .section("Project"),

    // TODO: save as/save copy
    // TODO: split at cursor
    undo: command(["KeyZ", "meta"], (e) => {
      history.undo();
      e?.preventDefault();
    })
      .helptext("Undo", "Note: EXPERIMENTAL!")
      .section("Project"),

    redo: command(["KeyZ", "shift", "meta"], (e) => {
      history.redo();
      e?.preventDefault();
    })
      .helptext("Redo", "Note: EXPERIMENTAL!")
      .section("Project"),

    createAudioTrack: command(["KeyT", "ctrl"], (e, project) => {
      userActions.addAudioTrack(project);
      e?.preventDefault();
    })
      .helptext("New Audio Track")
      .section("Project"),

    createMidiTrack: command(["KeyT", "ctrl", "shift"], async (e, project) => {
      e?.preventDefault();
      await userActions.addMidiTrack(project);
    }).section("Project"),

    createMidiClipAtSelection: command(["KeyM", "ctrl", "shift"], async (e, project) => {
      e?.preventDefault();
      await userActions.addMidiClipAtSelection(project);
    }).section("Project"),

    createSampleMidiClip: command(["KeyM", "ctrl", "shift", "alt"], async (e, project) => {
      e?.preventDefault();
      await userActions.addSampleMidiClip(project);
    }).section("Project"),

    deleteSelection: command(["Backspace"], (e, project) => {
      const activePanel = project.activePanel.get();
      console.log("active", activePanel);
      switch (activePanel) {
        case "primary":
          userActions.deletePrimarySelection(project);
          break;
        case "secondary":
          userActions.deleteSecondarySelection(project);
          break;
        case "sidebar":
          userActions.deleteSidebarSelection(project);
          break;
      }
      e?.preventDefault();
    }).section("Edit"),

    duplicateSelection: command(["KeyD", "meta"], (e, project) => {
      userActions.duplicateSelection(project);
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

    loopWithBrace: command(["KeyL", "meta"], (e, project) => {
      const selectionState = project.selected.get();
      if (selectionState == null) {
        return;
      }
      switch (selectionState.status) {
        case "track_time":
        case "time": {
          const thisLoopIsSelected =
            project.loopOnPlayback.get() === true &&
            project.loopStart.secs(project) === selectionState.startS &&
            project.loopEnd.secs(project) === selectionState.endS;
          if (thisLoopIsSelected) {
            project.loopOnPlayback.set(false);
          } else {
            project.loopOnPlayback.set(true);
            project.loopStart.set(selectionState.startS, "seconds");
            project.loopEnd.set(selectionState.endS, "seconds");
          }
          e?.preventDefault();
          break;
        }
        case "loop_marker": {
          project.loopOnPlayback.set(!project.loopOnPlayback.get());
          e?.preventDefault();
          break;
        }
        case "clips": {
          // Works across different units (ie, AudioClips and MidiClips)
          // even though selection state, as of rn, is only one or the other

          const clips = selectionState.clips.map((s) => s.clip);
          if (clips.length === 0) {
            throw new Error("empty clips what");
          }

          const [clipsStart, clipsEnd] = nullthrows(
            clipsLimits(
              project,
              selectionState.clips.map((s) => s.clip),
            ),
          );

          const thisLoopIsSelected =
            project.loopOnPlayback.get() === true &&
            project.loopStart.eq(clipsStart, project) &&
            project.loopEnd.eq(clipsEnd, project);

          if (thisLoopIsSelected) {
            project.loopOnPlayback.set(false);
          } else {
            project.loopOnPlayback.set(true);
            project.loopStart.set(clipsStart);
            project.loopEnd.set(clipsEnd);
          }
          break;
        }

        case "effects":
        case "tracks":
          // nothing to do
          break;
        default:
          exhaustive(selectionState);
      }
      e?.preventDefault();
    })
      .helptext("Loop selection")
      .section("Playback"),

    // Clipboard
    copySelection: command(["KeyC", "meta"], (e, project) => {
      ProjectSelection.copySelection(project);
      e?.preventDefault();
    })
      .helptext("Copy", "Currently works only with clips")
      .section("Edit"),

    pasteClipboard: command(["KeyV", "meta"], (e, project) => {
      userActions.doPaste(project);
      e?.preventDefault();
    })
      .helptext("Paste", "Currently works only with clips")
      .section("Edit"),

    // rename: command(["KeyR", "meta"], async (e, project) => {
    //   e?.preventDefault();
    //   e?.stopPropagation();
    //   return console.log("RENAME");
    // })
    //   .helptext("Rename", "Rename selection")
    //   .section("Project"),

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
      const project = await projectPersistance.sampleProject();
      appEnvironment.loadProject(project);
    }),

    // Other
    escape: command(["Escape"], (_, _project) => {
      const pressed = pressedState.get();
      if (pressed == null) {
        return;
      }

      switch (pressed.status) {
        case "moving_clip": {
          // cancelMovingClip(pressed, project);
          break;
        }
        case "dragging_transferable":
        // TODO: cancel drag?
        case "resizing_clip":
        case "resizing_track":
        case "selecting_global_time":
        case "selecting_track_time":
        case "moving_timeline_points":
          break;
        case null:
          break;
        default:
          exhaustive(pressed);
      }
    }),
  };
});
