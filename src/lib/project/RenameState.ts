import { AudioTrack } from "../AudioTrack";
import AudioClip from "../AudioClip";
import { MidiTrack } from "../../midi/MidiTrack";
import { MidiClip } from "../../midi/MidiClip";

// TODO: I think this is not necessary
export type RenameState =
  | {
      status: "track";
      track: AudioTrack | MidiTrack;
    }
  | {
      status: "clip";
      clip: AudioClip | MidiClip;
    }
  | {
      status: "number";
    };
