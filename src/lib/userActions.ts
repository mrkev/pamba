import { history } from "structured-state";
import { midiClip, MidiClip } from "../midi/MidiClip";
import { MidiTrack } from "../midi/MidiTrack";
import { doConfirm } from "../ui/ConfirmDialog";
import { exhaustive } from "../utils/exhaustive";
import { nullthrows } from "../utils/nullthrows";
import { appEnvironment } from "./AppEnvironment";
import { AudioTrack } from "./AudioTrack";
import { AnalizedPlayer } from "./io/AnalizedPlayer";
import { AudioProject, deleteTime } from "./project/AudioProject";
import { doPaste } from "./project/ClipboardState";
import { cliptrack } from "./project/ClipTrack";
import { selection } from "./project/selection";
import { PrimarySelectionState } from "./project/SelectionState";
import { timeop } from "./project/TimelineOperation";
import { standardTrack } from "./StandardTrack";

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
          standardTrack.addClip(project, ctsel.track, clone);
          selection.selectClip(project, cliptrack(clone, ctsel.track));

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
        standardTrack.removeClip(project, track, clip);
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
      alert("TODO: remove effect");
      // AudioTrack.removeEffect(track, effect);
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
  deletePrimarySelection(project: AudioProject) {
    console.log("FOOOOOOOOOOOOOOOOOOO");
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
              standardTrack.deleteTime(project, track, primarySelection.startS, primarySelection.endS);
            });
          } else if (track instanceof MidiTrack) {
            standardTrack.deleteTime(
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

  deleteSecondarySelection(project: AudioProject) {
    const secondarySelection = project.secondarySelection.get();
    if (secondarySelection == null) {
      return;
    }

    switch (secondarySelection.status) {
      case "notes":
      case "audioTime":
        break;
      default:
        exhaustive(secondarySelection);
    }

    throw new Error("Not implemented");
  },

  deleteSidebarSelection(project: AudioProject) {
    throw new Error("Not implemented");
    // TODO
  },

  async addMidiClipAtSelection(project: AudioProject) {
    const selected = project.selected.get();
    if (selected?.status !== "track_time") {
      return false;
    }

    const track = selected.tracks.at(0);
    if (!(track instanceof MidiTrack)) {
      return false;
    }

    const startPulses = project.viewport.secsToPulses(selected.startS);
    const endPulses = project.viewport.secsToPulses(selected.endS);

    const clip = MidiClip.of(track.name.get(), startPulses, endPulses - startPulses, []);
    return standardTrack.addClip(project, track, clip);
  },

  async addSampleMidiClip(project: AudioProject) {
    const activeTrack = project.activeTrack.get();
    if (!(activeTrack instanceof MidiTrack)) {
      return false;
    }

    const clip = midiClip.createSampleMidiClip();
    standardTrack.addClip(project, activeTrack, clip);
  },
};
