// Shared with audio worker

import { SharedAudioBuffer } from "../../lib/SharedAudioBuffer";

export type SimpleAudioClip = {
  id: string;
  buffer: SharedAudioBuffer;
  // todo, make all secs frames?
  startOffsetPulses: number;
  // so we know
  endOffsetPulses: number; // todo, make frames?
};

export type AudioTrackProcessorMessage =
  //
  { action: "set_clips"; seqClips: SimpleAudioClip[] };
