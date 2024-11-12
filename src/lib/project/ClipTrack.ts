import { MidiClip } from "../../midi/MidiClip";
import { MidiTrack } from "../../midi/MidiTrack";
import { AudioClip } from "../AudioClip";
import { AudioTrack } from "../AudioTrack";

export type ClipTrack =
  | { kind: "audio"; clip: AudioClip; track: AudioTrack }
  | { kind: "midi"; clip: MidiClip; track: MidiTrack };

export function cliptrack(clip: AudioClip | MidiClip, track: AudioTrack | MidiTrack): ClipTrack {
  if (clip instanceof MidiClip && track instanceof MidiTrack) {
    return { kind: "midi", clip, track };
  } else if (clip instanceof AudioClip && track instanceof AudioTrack) {
    return { kind: "audio", clip, track };
  } else {
    throw new Error("invalid cliptrack");
  }
}
