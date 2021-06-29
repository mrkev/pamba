import { loadSound } from "./loadSound";
import { dataURLForWaveform } from "./waveform";
import { audioContext } from "../globals";
import { BaseClip } from "./BaseClip";

// A clip of audio
export class AudioClip extends BaseClip {
  readonly buffer: AudioBuffer;
  readonly numberOfChannels: number;

  name: string;

  toString() {
    return `${this.startOffsetSec} [ ${this.trimStartSec} | ${this.name} | ${this.trimEndSec} ] ${this.endOffsetSec}`;
  }

  // Let's not pre-compute this since we don't know the acutal dimensions
  // but lets memoize the last size used for perf. shouldn't change.
  private memodWaveformDataURL: { dims: [number, number]; data: string } = {
    dims: [0, 0],
    data: "",
  };

  constructor(buffer: AudioBuffer, name: string = "untitled") {
    // todo, should convert buffer.length to seconds myself? Are buffer.duration
    // and buffer.length always congruent?
    super({ lengthSec: buffer.duration, sampleRate: buffer.sampleRate });
    this.buffer = buffer;
    this.numberOfChannels = buffer.numberOfChannels;
    this.name = name;
  }

  clone() {
    const newClip = new AudioClip(this.buffer, this.name);
    newClip.startOffsetSec = this.startOffsetSec;
    newClip.trimStartSec = this.trimStartSec;
    newClip.trimEndSec = this.trimEndSec;
    // todo: endOffsetSec?
    return newClip;
  }

  getWaveformDataURL(width: number, height: number) {
    const {
      dims: [w, h],
      data,
    } = this.memodWaveformDataURL;
    if (width === w && height === h) {
      return data;
    }
    const waveform = dataURLForWaveform(width, height, this.buffer);
    this.memodWaveformDataURL = { dims: [width, height], data: waveform };
    console.log("generated waveform for", this.name);
    return waveform;
  }

  static async fromURL(url: string, name?: string) {
    const buffer = await loadSound(audioContext, url);
    return new AudioClip(buffer, name || url);
  }
}
