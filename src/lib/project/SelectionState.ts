import { AudioTrack } from "../AudioTrack";
import { AudioClip } from "../AudioClip";
import { FaustAudioEffect } from "../../dsp/FaustAudioEffect";
import { PambaWamNode } from "../../wam/PambaWamNode";
import { MidiTrack } from "../../midi/MidiTrack";
import { MidiClip } from "../../midi/MidiClip";

// todo, 3 Selection states:
// main selection state clip/track/time
// - what displays in the bottom panel
// - what keyboard shortcuts operate on
// detail selection state (note)
// - what is selected in the bottom panel
// - clip is still selected, but user might want to operate on this note specifically d
// browser active element, to edit
// - what the user is typing to, etc

export type SelectionState =
  | {
      status: "clips";
      clips: Array<{ clip: AudioClip; track: AudioTrack } | { clip: MidiClip; track: MidiTrack }>;
      test: Set<AudioClip | AudioTrack | MidiClip | MidiTrack>;
    }
  | {
      status: "tracks";
      tracks: Array<AudioTrack | MidiTrack>;
      test: Set<AudioTrack | MidiTrack>;
    }
  | {
      status: "effects";
      effects: Array<{ effect: FaustAudioEffect | PambaWamNode; track: AudioTrack | MidiTrack }>;
      test: Set<FaustAudioEffect | PambaWamNode>;
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
    }
  | {
      status: "track_time";
      start: number;
      end: number;
      tracks: Array<AudioTrack | MidiTrack>;
      test: Set<AudioTrack | MidiTrack>;
    };
