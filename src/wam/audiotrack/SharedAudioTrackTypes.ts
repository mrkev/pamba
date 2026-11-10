// Shared with audio worker

/**
 * An audio clip as the AudioTrackProcessor sees it: plain data plus the clip's
 * SharedArrayBuffer-backed sample data, so the audio thread reads the samples
 * directly, with no copying.
 *
 * Times are in seconds; the processor converts them to frames at its own sample
 * rate, resampling if the clip's buffer was decoded at a different one.
 */
export type SimpleAudioClip = Readonly<{
  id: string;
  /** One SharedArrayBuffer of Float32 samples per channel. Mono clips play on both outputs. */
  channels: readonly SharedArrayBuffer[];
  /** Sample rate of `channels` */
  sampleRate: number;
  /** Where the clip starts on the timeline */
  timelineStartSec: number;
  /** How long the clip lasts on the timeline */
  timelineLengthSec: number;
  /** Where in the buffer the clip starts playing from (ie, trimmed off the front) */
  bufferOffsetSec: number;
}>;

export type AudioTrackProcessorMessage =
  /** Replaces the full clip list. Safe to send at any time, including mid-playback. */
  | { action: "set_clips"; seqClips: readonly SimpleAudioClip[] }
  /**
   * Starts playback: at audio-context time `startCtxTime`, the timeline position is
   * `startSec`. If the message arrives after `startCtxTime` the processor joins in
   * at wherever the clock says the playhead is, so it stays in sync with the other
   * tracks rather than starting late.
   */
  | {
      action: "play";
      startCtxTime: number;
      startSec: number;
      loop: readonly [startSec: number, endSec: number] | null;
    }
  | { action: "stop" };
