import { AudioTrack } from "./AudioTrack";
import { LinkedState } from "./state/LinkedState";
import { LinkedSet } from "./state/LinkedSet";
import { DerivedState } from "./state/DerivedState";
import AudioClip from "./AudioClip";
import { scaleLinear } from "d3-scale";
import type { ScaleLinear } from "d3-scale";
import { LinkedArray } from "./state/LinkedArray";
import { AnalizedPlayer } from "./AnalizedPlayer";
import { exhaustive } from "../dsp/exhaustive";
import { FaustAudioEffect } from "../dsp/Faust";
import { LinkedMap } from "./state/LinkedMap";
import { modifierState } from "../ModifierState";

export type XScale = ScaleLinear<number, number>;

export type Tool = "move" | "trimStart" | "trimEnd";

export type SelectionState =
  | {
      status: "clips";
      clips: Array<{ clip: AudioClip; track: AudioTrack }>;
      test: Set<AudioClip | AudioTrack>;
    }
  | {
      status: "tracks";
      tracks: Array<AudioTrack>;
      test: Set<AudioTrack>;
    }
  | {
      status: "effects";
      effects: Array<{ effect: FaustAudioEffect; track: AudioTrack }>;
      test: Set<FaustAudioEffect>;
    }
  // Not sure if have is a good idea, since user might want to select time
  // and then select a track to operaate on (ie, delete on track 1, then same
  // time on track 3). Ableton has 2 selection states it seems. Although, how
  // do you know what the cursor operates on anyway (time or track). Maybe it is
  // a good idea to have a simple model.
  | {
      status: "time";
      start: number;
      end: number;
    };

export type RenameState = {
  status: "track";
  track: AudioTrack;
};

export class AudioProject {
  timeMarkers: LinkedMap<number, string> = LinkedMap.create<number, string>();
  // Track data - should persist //
  allTracks = LinkedArray.create<AudioTrack>();

  // Track status //
  solodTracks = LinkedSet.create<AudioTrack>();
  dspExpandedTracks = LinkedSet.create<AudioTrack>();

  // Pointer //
  pointerTool = LinkedState.of<Tool>("move");
  cursorPos = LinkedState.of(0);

  // Selection //

  // the selected clip(s), track(s), etc
  selected = LinkedState.of<SelectionState | null>(null);
  // the thing we're currently renaming, if any
  currentlyRenaming = LinkedState.of<RenameState | null>(null);
  // the width of the selection at the playback cursor
  selectionWidth = LinkedState.of<number | null>(null);
  // the zoom level
  scaleFactor = LinkedState.of(10);
  viewportStartSecs = LinkedState.of(0); // the first second visible in the project div
  // 1 sec corresponds to 10 px
  secsToPx = DerivedState.from(
    [this.scaleFactor],
    (factor: number) =>
      scaleLinear()
        .domain([0, 100])
        .range([0, 100 * factor]) as XScale
  );

  //////// Methods on Projects ////////

  // TODO: maybe let's not try to add this track to playback
  static addTrack(project: AudioProject, player: AnalizedPlayer, track?: AudioTrack) {
    const newTrack = track ?? AudioTrack.empty();
    project.allTracks.push(newTrack);
    if (player.isAudioPlaying) {
      console.log("ADDED TO PLAYBACK");
      player.addTrackToPlayback(newTrack, project.cursorPos.get());
    }
    return newTrack;
  }

  static removeTrack(project: AudioProject, player: AnalizedPlayer, track: AudioTrack) {
    const selected = project.selected.get();
    const pos = project.allTracks.indexOf(track);
    if (pos === -1) {
      return;
    }

    project.allTracks.splice(pos, 1);

    // Remove it from playback
    if (player.isAudioPlaying) {
      console.log("ADDED TO PLAYBACK");
      player.removeTrackFromPlayback(track);
    }

    // Update selected
    if (selected && selected.status === "tracks" && selected.test.has(track)) {
      selected.test.delete(track);
      const newSelected = {
        ...selected,
        tracks: selected.tracks.filter((selectoin) => selectoin !== track),
      };
      project.selected.set(newSelected);
    }
  }

  static removeClip(project: AudioProject, track: AudioTrack, clip: AudioClip) {
    const selected = project.selected.get();
    track.removeClip(clip);
    if (selected && selected.status === "clips") {
      project.selected.set({
        ...selected,
        clips: selected.clips.filter((selection) => selection.clip !== clip),
      });
    }
  }
}

export class ProjectSelection {
  static selectTrack(project: AudioProject, track: AudioTrack) {
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
    }
  }

  /**
   * Deletes whatever is selected
   */
  static deleteSelection(project: AudioProject, player: AnalizedPlayer) {
    const selected = project.selected.get();
    if (!selected) {
      return;
    }
    const { status } = selected;
    switch (status) {
      case "clips": {
        for (let { clip, track } of selected.clips) {
          console.log("remove", selected);
          AudioProject.removeClip(project, track, clip);
          project.selected.set(null);
        }
        break;
      }
      case "tracks": {
        for (let track of selected.tracks) {
          console.log("remove", selected);
          AudioProject.removeTrack(project, player, track);
          project.selected.set(null);
        }
        break;
      }
      case "effects": {
        for (let { track, effect } of selected.effects) {
          console.log("remove", selected);
          AudioTrack.removeEffect(track, effect);
          project.selected.set(null);
        }
        break;
      }
      case "time": {
        // todo
        break;
      }
      default:
        exhaustive(status);
    }
  }
}
