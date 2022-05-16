import { loadSound } from "./loadSound";
import { dataURLForWaveform } from "./waveform";
import { staticAudioContext } from "../globals";
import { BaseClip } from "./BaseClip";
import nullthrows from "./nullthrows";

class SharedAudioBuffer implements AudioBuffer {
  channels: SharedArrayBuffer[] = [];
  readonly length: number;
  readonly duration: number;
  readonly numberOfChannels: number;
  readonly sampleRate: number;

  constructor(audioBuffer: AudioBuffer) {
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      // TODO: Can I already shere these buffers?
      const floats = audioBuffer.getChannelData(c);
      const sab = new SharedArrayBuffer(floats.buffer.byteLength);
      const sharedFloats = new Float32Array(sab);
      sharedFloats.set(floats, 0);
      this.channels.push(sab);
    }

    this.length = audioBuffer.length;
    this.duration = audioBuffer.duration;
    this.numberOfChannels = audioBuffer.numberOfChannels;
    this.sampleRate = audioBuffer.sampleRate;
  }

  copyFromChannel(destination: Float32Array, channelNumber: number, bufferOffset?: number): void {
    destination.set(this.getChannelData(channelNumber), bufferOffset);
  }
  copyToChannel(source: Float32Array, channelNumber: number, bufferOffset?: number): void {
    const channel = this.getChannelData(channelNumber);
    channel.set(source, bufferOffset);
  }
  getChannelData(channel: number): Float32Array {
    return nullthrows(new Float32Array(this.channels[channel]), `Channel ${channel} does not exist`);
  }
}

// A clip of audio
export class AudioClip extends BaseClip {
  readonly buffer: SharedAudioBuffer;
  readonly numberOfChannels: number;
  name: string;
  gainAutomation: Array<{ time: number; value: number }> = [{ time: 0, value: 1 }];

  override toString() {
    return `${this.startOffsetSec.toFixed(2)} [ ${this.trimStartSec.toFixed(2)} | ${
      this.name
    } | ${this.trimEndSec.toFixed(2)} ] ${this.endOffsetSec.toFixed(2)}`;
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
    this.buffer = new SharedAudioBuffer(buffer);
    this.numberOfChannels = buffer.numberOfChannels;
    this.name = name;
  }

  override clone() {
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
    const buffer = await loadSound(staticAudioContext, url);
    return new AudioClip(buffer, name || url);
  }
}
