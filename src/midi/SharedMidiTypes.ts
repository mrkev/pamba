// Shared with audio worker

export type Note = readonly [tick: number, number: number, duration: number, velocity: number];

export type SimpleMidiClip = {
  notes: readonly Note[];
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
  | { action: "midiConfig"; config: any }
  | { action: "play"; id: string }
  | { action: "prepare_playback"; seqClips: SimpleMidiClip[]; loop: readonly [number, number] | null };
// | { action: "setPlaybackStartOffset"; offsetSec: number };
