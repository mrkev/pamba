import { AudioTrack } from "./AudioTrack";
import { LinkedState } from "./LinkedState";
import { DerivedState } from "./DerivedState";
import { AudioClip } from "./AudioClip";
import { scaleLinear } from "d3-scale";
import type { ScaleLinear } from "d3-scale";

type XScale = ScaleLinear<number, number>;

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
  // Should persist
  allTracks = LinkedState.of<Array<AudioTrack>>([]);
  solodTracks = LinkedState.of<Set<AudioTrack>>(new Set());
  dspExpandedTracks = LinkedState.of<Set<AudioTrack>>(new Set());

  // the selected clip(s), track(s), etc
  selected = LinkedState.of<SelectionState | null>(null);
  // the width of the selection at the playback cursor
  selectionWidth = LinkedState.of<number | null>(null);

  scaleFactor = LinkedState.of<number>(10);
  // 1 sec corresponds to 10 px
  secsToPx = DerivedState.from(
    [this.scaleFactor],
    (factor: number) =>
      scaleLinear()
        .domain([0, 100])
        .range([0, 100 * factor]) as XScale
  );

  removeTrack(track: AudioTrack) {
    const tracks = this.allTracks.get();
    const selected = this.selected.get();
    const pos = tracks.indexOf(track);
    if (pos === -1) {
      return;
    }
    const copy = tracks.map((x) => x);
    copy.splice(pos, 1);
    if (selected && selected.status === "tracks" && selected.test.has(track)) {
      // TODO: remove track from selected tracks
    }

    this.allTracks.set(copy);
  }
}

/**
 * TODO:
 * - Implement solo-ing by adding a second gain node, or a "gate" node with just
 *   an on-off value, completley hidden for the user and just for the sake of solo-ing.
 */
