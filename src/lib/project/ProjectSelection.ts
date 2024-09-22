import { history } from "structured-state";
import { modifierState } from "../../ModifierState";
import { FaustAudioEffect } from "../../dsp/FaustAudioEffect";
import { MidiClip } from "../../midi/MidiClip";
import { MidiTrack } from "../../midi/MidiTrack";
import { exhaustive } from "../../utils/exhaustive";
import { PambaWamNode } from "../../wam/PambaWamNode";
import { appEnvironment } from "../AppEnvironment";
import { AudioClip } from "../AudioClip";
import { AudioTrack } from "../AudioTrack";
import { ProjectTrack } from "../ProjectTrack";
import { clipboard } from "./ClipboardState";
import { AudioProject, deleteTime } from "./AudioProject";

export class ProjectSelection {
  /**
   * selects a track
   */
  static selectTrack(project: AudioProject, track: AudioTrack | MidiTrack) {
    const selected = project.selected.get();
    const selectAdd = modifierState.meta || modifierState.shift;
    if (selectAdd && selected?.status === "tracks") {
      const next = { ...selected };
      next.tracks.push(track);
      next.test.add(track);
      project.selected.set(next);
    } else {
      project.selected.set({
        status: "tracks",
        tracks: [track],
        test: new Set([track]),
      });
      project.activeTrack.set(track);
    }
  }

  static selectEffect(project: AudioProject, effect: FaustAudioEffect | PambaWamNode, track: AudioTrack | MidiTrack) {
    project.selected.set({
      status: "effects",
      effects: [{ effect, track }],
      test: new Set([effect]),
    });
  }

  /**
   * Deletes whatever is selected
   */
  static deleteSelection(project: AudioProject) {
    const selected = project.selected.get();
    if (selected == null) {
      return;
    }

    switch (selected.status) {
      case "clips": {
        for (const { clip, track } of selected.clips) {
          console.log("remove", selected);
          if (track instanceof MidiTrack && clip instanceof MidiClip) {
            AudioProject.removeMidiClip(project, track, clip);
          } else if (track instanceof AudioTrack && clip instanceof AudioClip) {
            AudioProject.removeAudioClip(project, track, clip);
          } else {
            console.log("TODO, delete mixed!");
          }
          project.selected.set(null);
        }
        break;
      }
      case "tracks": {
        if (appEnvironment.renderer.analizedPlayer.isAudioPlaying) {
          // todo: some sort of alert or feedback, can't edit tracks while playing?
          break;
        }

        const selectedTracks = new Set(selected.tracks);
        const noneLocked = project.lockedTracks.isDisjointFrom(selectedTracks);

        if (!noneLocked) {
          alert("some tracks are locked!");
          break;
        }

        // TODO: if playing don't delete. show track locked?
        for (const track of selected.tracks) {
          console.log("remove", selected);
          AudioProject.removeTrack(project, appEnvironment.renderer.analizedPlayer, track);
          project.selected.set(null);
        }
        break;
      }
      case "effects": {
        for (const { track, effect } of selected.effects) {
          console.log("remove", selected);
          AudioTrack.removeEffect(track, effect);
          project.selected.set(null);
        }
        break;
      }
      case "time": {
        history.record(() => {
          for (const track of project.allTracks) {
            deleteTime(project, track, selected.startS, selected.endS);
          }
        });
        break;
      }
      case "track_time":
        for (const track of selected.tracks) {
          if (track instanceof AudioTrack) {
            // TODO: move history.record(...) up to the command level as possible
            history.record(() => {
              ProjectTrack.deleteTime(project, track, selected.startS, selected.endS);
            });
          } else if (track instanceof MidiTrack) {
            ProjectTrack.deleteTime(
              project,
              track,
              project.viewport.secsToPulses(selected.startS),
              project.viewport.secsToPulses(selected.endS),
            );
          }
        }
        break;

      case "loop_marker":
        // can't delete loop markers, deactivate looping if active
        project.loopOnPlayback.set(false);
        project.selected.set(null);
        break;
      default:
        exhaustive(selected);
    }
  }

  static duplicateSelection(project: AudioProject) {
    const selected = project.selected.get();

    if (!selected) {
      return;
    }

    switch (selected.status) {
      case "loop_marker":
        // Can't duplicate loop markers
        break;
      case "clips":
      case "tracks":
      case "effects":
      case "time":
      case "track_time":
        break;
      default:
        exhaustive(selected);
    }
  }

  static copySelection(project: AudioProject) {
    const selected = project.selected.get();

    if (!selected) {
      return;
    }

    switch (selected.status) {
      case "clips": {
        clipboard.set({ kind: "clips", clips: selected.clips.map((selection) => selection.clip.clone()) });
        break;
      }
      case "tracks":
      case "effects":
      case "time":
      case "track_time":
      case "loop_marker":
        break;
      default:
        exhaustive(selected);
    }
  }
}

// TODO: ProjectSelection vs ProjectAction
