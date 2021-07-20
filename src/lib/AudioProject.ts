import { AudioTrack } from "./AudioTrack";
import { LinkedState } from "./LinkedState";
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
    };

export class AudioProject {
  // Should persist
  tracks: LinkedState<Array<AudioTrack>> = LinkedState.of<Array<AudioTrack>>(
    []
  );
  solod: LinkedState<Array<AudioTrack>> = LinkedState.of<Array<AudioTrack>>([]);

  // the selected clip(s), track(s), etc
  selected: LinkedState<SelectionState | null> =
    LinkedState.of<SelectionState | null>(null);
  // the width of the selection at the playback cursor
  selectionWidth: LinkedState<number | null> = LinkedState.of<number | null>(
    null
  );

  // 1 sec corresponds to 10 px
  secsToPx: LinkedState<XScale> = LinkedState.of<XScale>(
    scaleLinear().domain([0, 100]).range([0, 1000])
  );

  removeTrack(track: AudioTrack) {
    const tracks = this.tracks.get();
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

    this.tracks.set(copy);
  }
}
