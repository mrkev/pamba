import { history } from "structured-state";
import { MidiClip } from "../midi/MidiClip";
import { MidiTrack } from "../midi/MidiTrack";
import { doConfirm } from "../ui/ConfirmDialog";
import { AnalizedPlayer } from "./io/AnalizedPlayer";
import { appEnvironment } from "./AppEnvironment";
import { AudioClip } from "./AudioClip";
import { AudioTrack } from "./AudioTrack";
import { AudioProject, deleteTime } from "./project/AudioProject";
import { doPaste } from "./project/ClipboardState";
import { ProjectSelection } from "./project/ProjectSelection";
import { PrimarySelectionState } from "./project/SelectionState";
import { ProjectTrack } from "./ProjectTrack";
import { exhaustive } from "./state/Subbable";
import { nullthrows } from "../utils/nullthrows";
import { timeop } from "./project/TimelineT";
import { cliptrack } from "./project/ClipTrack";

/** User actions record hisotry */
export const userActions = {
  addAudioTrack: (project: AudioProject) => {
    history.record("add audio track", () => {
      AudioProject.addAudioTrack(project, "top", undefined, appEnvironment.renderer.analizedPlayer);
    });
  },

  async addMidiTrack(project: AudioProject) {
    // TODO historoy
    await AudioProject.addMidiTrack(project);
  },

  deleteTrack: async (track: AudioTrack | MidiTrack, player: AnalizedPlayer, project: AudioProject) => {
    if (player.isAudioPlaying) {
      // todo: some sort of alert or feedback, can't edit tracks while playing?
      return;
    }

    if (project.lockedTracks.has(track)) {
      alert("track is locked");
      return;
    }

    if ((await doConfirm(`delete track "${track.name.get()}"?\n\nThis cannot be undone (yet)!`)) === "yes") {
      // TODO: HISTORY
      // history.record("delete track(s)", () => {
      AudioProject.removeTrack(project, player, track);
      // });
    }
  },

  doPaste(project: AudioProject) {
    // TODO: history. how?
    doPaste(project);
  },

  // selection
  duplicateSelection(project: AudioProject) {
    const selected = project.selected.get();
    if (!selected) {
      return;
    }

    history.record("duplicate selection", () => {
      switch (selected.status) {
        case "loop_marker":
          // Can't duplicate loop markers
          break;
        case "clips": {
          if (selected.clips.length !== 1) {
            // can only duplicate one clip atm
            return;
          }

          const ctsel = nullthrows(selected.clips.at(0));
          const clone = ctsel.clip.clone();
          clone.timelineStart.setTo(timeop(ctsel.clip.timelineStart, "+", ctsel.clip.timelineLength), project);
          ProjectTrack.addClip(project, ctsel.track, clone);
          ProjectSelection.selectClip(project, cliptrack(clone, ctsel.track));

          break;
        }

        case "tracks":
        case "effects":
        case "time":
        case "track_time":
          break;
        default:
          exhaustive(selected);
      }
    });
  },

  // todo: generalize beyond selection
  deleteSelectedClips(primarySelection: Extract<PrimarySelectionState, { status: "clips" }>, project: AudioProject) {
    history.record("remove clip(s)", () => {
      for (const { clip, track } of primarySelection.clips) {
        if (track instanceof MidiTrack && clip instanceof MidiClip) {
          AudioProject.removeMidiClip(project, track, clip);
        } else if (track instanceof AudioTrack && clip instanceof AudioClip) {
          AudioProject.removeAudioClip(project, track, clip);
        } else {
          console.warn("TODO, delete mixed!");
        }
        project.selected.set(null);
      }
    });
  },

  // todo: gneeralize beyond selextion
  deleteSelectedEffects(
    primarySelection: Extract<PrimarySelectionState, { status: "effects" }>,
    project: AudioProject,
  ) {
    // TODO: History
    for (const { track, effect } of primarySelection.effects) {
      console.log("remove", primarySelection);
      AudioTrack.removeEffect(track, effect);
      project.selected.set(null);
    }
  },

  deleteSelectedTime(primarySelection: Extract<PrimarySelectionState, { status: "time" }>, project: AudioProject) {
    history.record("delete time selection", () => {
      for (const track of project.allTracks) {
        // todo move here
        deleteTime(project, track, primarySelection.startS, primarySelection.endS);
      }
    });
  },

  /**
   * Deletes whatever is selected.    // TODO: history
   */
  deleteSelection(project: AudioProject) {
    const primarySelection = project.selected.get();
    if (primarySelection == null) {
      return;
    }

    switch (primarySelection.status) {
      case "clips":
        this.deleteSelectedClips(primarySelection, project);
        break;

      case "tracks": {
        if (appEnvironment.renderer.analizedPlayer.isAudioPlaying) {
          // todo: some sort of alert or feedback, can't edit tracks while playing?
          break;
        }

        const selectedTracks = new Set(primarySelection.tracks);
        const noneLocked = project.lockedTracks.isDisjointFrom(selectedTracks);

        if (!noneLocked) {
          alert("some tracks are locked!");
          break;
        }

        // TODO: if playing don't delete. show track locked?
        for (const track of primarySelection.tracks) {
          console.log("remove", primarySelection);
          AudioProject.removeTrack(project, appEnvironment.renderer.analizedPlayer, track);
          project.selected.set(null);
        }
        break;
      }
      case "effects":
        this.deleteSelectedEffects(primarySelection, project);
        break;

      case "time":
        this.deleteSelectedTime(primarySelection, project);
        break;

      case "track_time":
        for (const track of primarySelection.tracks) {
          if (track instanceof AudioTrack) {
            // TODO: move history.record(...) up to the command level as possible
            history.record("delete track time", () => {
              ProjectTrack.deleteTime(project, track, primarySelection.startS, primarySelection.endS);
            });
          } else if (track instanceof MidiTrack) {
            ProjectTrack.deleteTime(
              project,
              track,
              project.viewport.secsToPulses(primarySelection.startS),
              project.viewport.secsToPulses(primarySelection.endS),
            );
          }
        }
        break;

      case "loop_marker":
        /* Can't delete loop markers, deactivate looping if active */
        project.loopOnPlayback.set(false);
        project.selected.set(null);
        break;
      default:
        exhaustive(primarySelection);
    }
  },
};
