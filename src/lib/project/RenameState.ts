import { AudioTrack } from "../AudioTrack";
import AudioClip from "../AudioClip";

export type RenameState =
  | {
      status: "track";
      track: AudioTrack;
    }
  | {
      status: "clip";
      clip: AudioClip;
    }
  | {
      status: "number";
    };
