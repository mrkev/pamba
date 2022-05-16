import { AudioTrack } from "./AudioTrack";
import { LinkedState } from "./LinkedState";
import { LinkedSet } from "./LinkedSet";
import { DerivedState } from "./DerivedState";
import { AudioClip } from "./AudioClip";
import { scaleLinear } from "d3-scale";
import type { ScaleLinear } from "d3-scale";
import { LinkedArray } from "./LinkedArray";
import { AnalizedPlayer } from "../AnalizedPlayer";
import bufferToWav from "audiobuffer-to-wav";

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

export class AudioProject {
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

  static addTrack(project: AudioProject, player: AnalizedPlayer, track?: AudioTrack) {
    const newTrack = track ?? new AudioTrack();
    project.allTracks.push(newTrack);
    if (player.isAudioPlaying) {
      console.log("ADDED TO PLAYBACK");
      player.addTrackToPlayback(newTrack);
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

export class AudioRenderer {
  bounceURL = LinkedState.of<string | null>(null);
  isAudioPlaying = LinkedState.of(false);

  static async bounceSelection(renderer: AudioRenderer, project: AudioProject) {
    const selectionWidth = project.selectionWidth.get();
    const tracks = project.allTracks._getRaw();
    const cursorPos = project.cursorPos.get();
    const currentBounceURL = renderer.bounceURL.get();

    const bounceAll = !selectionWidth || selectionWidth === 0;

    const result = await (bounceAll
      ? AnalizedPlayer.bounceTracks(tracks)
      : AnalizedPlayer.bounceTracks(tracks, cursorPos, cursorPos + selectionWidth));
    const wav = bufferToWav(result);
    const blob = new Blob([new DataView(wav)], {
      type: "audio/wav",
    });
    const exportUrl = window.URL.createObjectURL(blob);

    if (currentBounceURL != null) {
      window.URL.revokeObjectURL(currentBounceURL);
    }

    renderer.bounceURL.set(exportUrl);
  }

  static togglePlayback(renderer: AudioRenderer, project: AudioProject, player: AnalizedPlayer) {
    if (renderer.isAudioPlaying.get()) {
      player.stopSound();
      renderer.isAudioPlaying.set(false);
    } else {
      player.playTracks(project.allTracks._getRaw());
      renderer.isAudioPlaying.set(true);
    }
  }
}

/**
 * TODO:
 * - Backspace deletes time
 * - Loop markers
 * - Export audio
 *
 */
