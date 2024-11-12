import { modifierState } from "../../ModifierState";
import { FaustAudioEffect } from "../../dsp/FaustAudioEffect";
import { MidiTrack } from "../../midi/MidiTrack";
import { exhaustive } from "../../utils/exhaustive";
import { PambaWamNode } from "../../wam/PambaWamNode";
import { AudioTrack } from "../AudioTrack";
import { AudioProject } from "./AudioProject";
import { clipboard } from "./ClipboardState";
import type { ClipTrack } from "./ClipTrack";

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

  static selectClip(project: AudioProject, cliptrack: ClipTrack, add: false = false) {
    project.selected.set({
      status: "clips",
      clips: [cliptrack],
      test: new Set([cliptrack.clip, cliptrack.track]),
    });
  }

  static selectEffect(project: AudioProject, effect: FaustAudioEffect | PambaWamNode, track: AudioTrack | MidiTrack) {
    project.selected.set({
      status: "effects",
      effects: [{ effect, track }],
      test: new Set([effect]),
    });
  }

  /// DELETION

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
