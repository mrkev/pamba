import { AudioTrack } from "./AudioTrack";
import { LinkedState } from "./LinkedState";

export class AudioProject {
  tracks: LinkedState<Array<AudioTrack>> = LinkedState.of<Array<AudioTrack>>(
    []
  );
  solod: LinkedState<Array<AudioTrack>> = LinkedState.of<Array<AudioTrack>>([]);
}
