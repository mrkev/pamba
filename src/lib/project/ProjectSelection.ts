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
import { PrimarySelectionState } from "./SelectionState";

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

  /// DELETION

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
