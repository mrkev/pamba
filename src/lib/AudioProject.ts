import { AudioTrack } from "./AudioTrack";
import { LinkedState } from "./LinkedState";
import { AudioClip } from "./AudioClip";

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

  selected: LinkedState<SelectionState | null> =
    LinkedState.of<SelectionState | null>(null);

  // don't need to persist
}
