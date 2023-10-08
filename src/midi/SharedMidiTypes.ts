// Shared with audio worker

export type Note = readonly [tick: number, number: number, duration: number, velocity: number];

export type SimpleClip = {
  notes: readonly Note[];
  // todo, make all secs frames?
  startOffsetSec: number;
  // so we know
  endOffsetSec: number; // todo, make frames?
};

export type PianoRollProcessorMessage =
  | {
      action: "clip";
      id: string;
      state: any;
    }
  | { action: "midiConfig"; config: any }
  | { action: "play"; id: string }
  | { action: "newclip"; seqClips: SimpleClip[] };
