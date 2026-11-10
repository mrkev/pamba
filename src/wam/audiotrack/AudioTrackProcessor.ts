import type { AudioWorkletGlobalScope } from "@webaudiomodules/api";
import getWamProcessor from "@webaudiomodules/sdk/src/WamProcessor.js";
import type { AudioTrackProcessorMessage, SimpleAudioClip } from "./SharedAudioTrackTypes";

const MODULE_ID = "com.aykev.audiotrack";
const audioWorkletGlobalScope = globalThis as unknown as AudioWorkletGlobalScope & {
  readonly currentFrame: number;
  readonly sampleRate: number;
};

const WamProcessor = getWamProcessor(MODULE_ID);

/** A clip, pre-converted to the processor's frame units, with its sample views created once */
type PlayableClip = {
  readonly id: string;
  readonly channels: readonly Float32Array[];
  readonly bufferLength: number;
  /** Timeline frame the clip starts at (inclusive), at the context's sample rate */
  readonly startFr: number;
  /** Timeline frame the clip ends at (exclusive), at the context's sample rate */
  readonly endFr: number;
  /** Position in the clip's buffer (in its own frames) that plays at `startFr` */
  readonly srcStartFr: number;
  /** Buffer frames advanced per output frame. 1 unless the clip's sample rate differs from the context's */
  readonly step: number;
};

type Transport = {
  /** Context frame at which the timeline was at `startFr` */
  readonly startCtxFr: number;
  readonly startFr: number;
  readonly loop: readonly [startFr: number, endFr: number] | null;
};

const BLOCK = 128;

/**
 * Plays an audio track's clips straight from their SharedArrayBuffers. The
 * processor owns the playhead, so the main thread only needs to send clip
 * metadata, and edits take effect within a render quantum or two, including
 * during playback.
 */
class AudioTrackProcessor extends WamProcessor {
  override _generateWamParameterInfo() {
    return {};
  }

  private clips: readonly PlayableClip[] = [];
  private transport: Transport | null = null;

  // Timeline frame for each sample of the current block (reused, to avoid allocating while rendering)
  private readonly positions = new Float64Array(BLOCK);

  /**
   * Messages from main thread appear here.
   */
  override async _onMessage(event: MessageEvent) {
    const payload: AudioTrackProcessorMessage | { action?: undefined } | null = event.data;
    if (payload == null || payload.action == null) {
      // Not ours: WAM requests (getState, setState, etc)
      return super._onMessage(event);
    }

    const sampleRate = audioWorkletGlobalScope.sampleRate;
    switch (payload.action) {
      case "set_clips":
        this.clips = payload.seqClips.map((clip) => playableClip(clip, sampleRate));
        return;
      case "play":
        this.transport = {
          startCtxFr: Math.round(payload.startCtxTime * sampleRate),
          startFr: Math.round(payload.startSec * sampleRate),
          loop:
            payload.loop == null
              ? null
              : [Math.round(payload.loop[0] * sampleRate), Math.round(payload.loop[1] * sampleRate)],
        };
        return;
      case "stop":
        this.transport = null;
        return;
      default:
        return super._onMessage(event);
    }
  }

  override process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>,
  ): boolean {
    const output = outputs[0];
    if (output == null || output.length === 0) {
      return true;
    }

    for (const channel of output) {
      channel.fill(0);
    }

    const transport = this.transport;
    if (transport == null || this.clips.length === 0) {
      return true;
    }

    const blockLength = output[0].length;
    const sinceStart = audioWorkletGlobalScope.currentFrame - transport.startCtxFr;
    if (sinceStart + blockLength <= 0) {
      // scheduled to start in a later block
      return true;
    }

    // Compute the timeline frame for each sample in this block, wrapping the loop
    const positions = blockLength <= BLOCK ? this.positions : new Float64Array(blockLength);
    const loop = transport.loop;
    for (let i = 0; i < blockLength; i++) {
      const elapsed = sinceStart + i;
      if (elapsed < 0) {
        positions[i] = -1; // not started yet
        continue;
      }
      let pos = transport.startFr + elapsed;
      // Same wrap rule as the playback cursor (AnalizedPlayer): once past loop start, wrap at loop end.
      if (loop != null && pos > loop[0] && loop[1] > loop[0]) {
        pos = loop[0] + ((pos - loop[0]) % (loop[1] - loop[0]));
      }
      positions[i] = pos;
    }

    const numOutputs = output.length;
    for (const clip of this.clips) {
      const numClipChannels = clip.channels.length;
      if (numClipChannels === 0) {
        continue;
      }

      for (let i = 0; i < blockLength; i++) {
        const pos = positions[i];
        if (pos < clip.startFr || pos >= clip.endFr) {
          continue;
        }

        const src = clip.srcStartFr + (pos - clip.startFr) * clip.step;
        const srcI = Math.floor(src);
        if (srcI < 0 || srcI >= clip.bufferLength) {
          continue;
        }
        const frac = src - srcI;
        const nextI = srcI + 1 < clip.bufferLength ? srcI + 1 : srcI;

        for (let c = 0; c < numOutputs; c++) {
          // mono clips go to every output channel
          const data = clip.channels[c < numClipChannels ? c : 0];
          output[c][i] += frac === 0 ? data[srcI] : data[srcI] + (data[nextI] - data[srcI]) * frac;
        }
      }
    }

    return true;
  }
}

function playableClip(clip: SimpleAudioClip, sampleRate: number): PlayableClip {
  const channels = clip.channels.map((sab) => new Float32Array(sab));
  const startFr = Math.round(clip.timelineStartSec * sampleRate);
  return {
    id: clip.id,
    channels,
    bufferLength: channels.length > 0 ? Math.min(...channels.map((c) => c.length)) : 0,
    startFr,
    endFr: startFr + Math.round(clip.timelineLengthSec * sampleRate),
    srcStartFr: clip.bufferOffsetSec * clip.sampleRate,
    step: clip.sampleRate / sampleRate,
  };
}

try {
  audioWorkletGlobalScope.registerProcessor(MODULE_ID, AudioTrackProcessor);
} catch (error) {
  console.warn(error);
}
