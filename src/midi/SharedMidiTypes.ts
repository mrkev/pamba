// Shared with audio worker
// import { MIDI } from "../wam/miditrackwam/MIDIConfiguration";

export type NoteT = [tick: number, number: number, duration: number, velocity: number];

export function notet(tick: number, number: number, duration: number, velocity: number): NoteT {
  return [tick, number, duration, velocity];
}

export type SequencerMidiClip = {
  id: string;
  muted: boolean;
  notes: readonly NoteT[];
  // todo, make all secs frames?
  startOffsetPulses: number;
  // so we know
  endOffsetPulses: number; // todo, make frames?
};

export type PianoRollProcessorMessage =
  | {
      action: "clip";
      id: string;
      state: any;
    }
  | { action: "add_note" }
  | { action: "midiConfig"; config: any }
  | { action: "play"; id: string }
  | { action: "prepare_playback"; seqClips: SequencerMidiClip[]; loop: readonly [number, number] | null }
  | { action: "set_clips"; seqClips: SequencerMidiClip[] }
  // immediates
  | {
      action: "immEvent";
      event: ["on", note: number, velocity: number] | ["off", note: number, velocity: number] | ["alloff"];
    }
  | {
      action: "clip_changed";
      clip: SequencerMidiClip;
    };

// | { action: "setPlaybackStartOffset"; offsetSec: number };
