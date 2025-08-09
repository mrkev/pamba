// Shared with audio worker

export type SimpleAudioClip = {
  id: string;
  channels: SharedArrayBuffer[];
  // todo, make all frames?
  startOffsetSec: number;
  // endOffsetT: number;
};

export type AudioTrackProcessorMessage =
  //
  { action: "set_clips"; seqClips: SimpleAudioClip[] } | { action: "play" } | { action: "stop" };
