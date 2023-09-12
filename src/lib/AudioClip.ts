import { loadSound } from "./loadSound";
import { dataURLForWaveform } from "../utils/waveform";
import { staticAudioContext } from "../constants";
import { BaseClip } from "./BaseClip";
import { SharedAudioBuffer } from "./SharedAudioBuffer";
import { notify, Subbable } from "./state/Subbable";
import { MutationHashable } from "./state/MutationHashable";

// A clip of audio
export default class AudioClip extends BaseClip implements Subbable<AudioClip>, MutationHashable {
  _hash: number = 0;
  _subscriptors: Set<(value: BaseClip) => void> = new Set();

  // AudioClip
  public name: string;
  readonly buffer: SharedAudioBuffer;
  readonly numberOfChannels: number;
  readonly bufferURL: string;

  gainAutomation: Array<{ time: number; value: number }> = [{ time: 0, value: 1 }];
  // Let's not pre-compute this since we don't know the acutal dimensions
  // but lets memoize the last size used for perf. shouldn't change.
  private memodWaveformDataURL: { width: number; height: number; data: string } = {
    width: 0,
    height: 0,
    data: "",
  };

  private constructor(buffer: AudioBuffer, name: string, bufferURL: string) {
    // todo, should convert buffer.length to seconds myself? Are buffer.duration
    // and buffer.length always congruent?
    super(buffer.duration, buffer.sampleRate, 0);
    this.buffer = new SharedAudioBuffer(buffer);
    this.numberOfChannels = buffer.numberOfChannels;
    this.name = name;
    this.bufferURL = bufferURL;
  }

  static async fromURL(url: string, name?: string) {
    const buffer = await loadSound(staticAudioContext, url);
    return new AudioClip(buffer, name || "untitled", url);
  }

  // On mutation, they notify their subscribers that they changed
  public notifyUpdate() {
    MutationHashable.mutated(this);
    notify(this, this);
  }

  override clone() {
    const newClip = new AudioClip(this.buffer, this.name, this.bufferURL);
    newClip.startOffsetSec = this.startOffsetSec;
    newClip.trimStartSec = this.trimStartSec;
    newClip.trimEndSec = this.trimEndSec;
    // todo: endOffsetSec?
    return newClip;
  }

  getWaveformDataURL(width: number, height: number) {
    const { width: w, height: h, data } = this.memodWaveformDataURL;
    if (width === w && height === h) {
      return data;
    }
    const waveform = dataURLForWaveform(width, height, this.buffer);
    this.memodWaveformDataURL = { width, height, data: waveform };
    console.log("generated waveform for", this.name);
    return waveform;
  }

  override toString() {
    return `${this.startOffsetSec.toFixed(2)} [ ${this.trimStartSec.toFixed(2)} | ${
      this.name
    } | ${this.trimEndSec.toFixed(2)} ] ${this.endOffsetSec.toFixed(2)}`;
  }
}
