import { FaustAudioEffect } from "../../dsp/FaustAudioEffect";
import { MidiClip } from "../../midi/MidiClip";
import { MidiTrack } from "../../midi/MidiTrack";
import { modifierState } from "../../ui/ModifierState";
import { exhaustive } from "../../utils/exhaustive";
import { PambaWamNode } from "../../wam/PambaWamNode";
import { AudioClip } from "../AudioClip";
import { AudioTrack } from "../AudioTrack";
import { AudioProject } from "./AudioProject";
import { clipboard } from "./ClipboardState";
import type { ClipTrack } from "./ClipTrack";

export const selection = {
  /**
   *
   */
  selectClip(project: AudioProject, cliptrack: ClipTrack, add?: boolean) {
    const selected = project.selected.get();
    const { clip, track } = cliptrack;

    if (add && selected !== null && selected.status === "clips") {
      if (!selected.test.has(clip)) {
        selected.clips.push(cliptrack);
        selected.test.add(clip);
        selected.test.add(track);
      }
      project.selected.set({ ...selected });
    } else {
      project.selected.set({
        status: "clips",
        clips: [cliptrack],
        test: new Set([cliptrack.clip, cliptrack.track]),
      });
    }
  },

  /**
   *
   */
  unselectClip(project: AudioProject, cliptrack: ClipTrack): void {
    const selected = project.selected.get();
    const { clip, track } = cliptrack;

    if (selected == null || selected.status !== "clips") {
      // not selected
      return;
    }

    const cliptracks = selected.clips.filter((cliptrack) => cliptrack.clip !== clip);

    selected.test.delete(clip);
    selected.test.delete(track);

    if (cliptracks.length == 0) {
      project.selected.set(null);
    } else {
      project.selected.set({
        status: "clips",
        clips: cliptracks,
        test: selected.test,
      });
    }
  },

  isSelectedClip(project: AudioProject, clip: AudioClip | MidiClip) {
    const selected = project.selected.get();
    const isSelected = selected !== null && selected.status === "clips" && selected.test.has(clip);
    return isSelected;
  },

  /**
   * selects a track
   */
  selectTrack(project: AudioProject, track: AudioTrack | MidiTrack) {
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
  },

  selectEffect(project: AudioProject, effect: FaustAudioEffect | PambaWamNode, track: AudioTrack | MidiTrack) {
    project.selected.set({
      status: "effects",
      effects: [{ effect, track }],
      test: new Set([effect]),
    });
  },

  /// DELETION

  copySelection(project: AudioProject) {
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
  },
};
