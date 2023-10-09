import { staticAudioContext } from "../constants";
import { MidiClip, secsToPulses } from "../midi/MidiClip";
import { stepNumber } from "../utils/math";
import { dataURLForWaveform } from "../utils/waveform";
import { AbstractClip, BaseClip } from "./BaseClip";
import { SharedAudioBuffer } from "./SharedAudioBuffer";
import { loadSound } from "./loadSound";
import { AudioProject } from "./project/AudioProject";
import { MutationHashable } from "./state/MutationHashable";
import { Subbable, notify } from "./state/Subbable";

// A clip of audio
export default class AudioClip extends BaseClip implements Subbable<AudioClip>, MutationHashable, AbstractClip {
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

  override clone(): AudioClip {
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
    // console.log("generated waveform for", this.name);
    return waveform;
  }

  override toString() {
    return `${this.startOffsetSec.toFixed(2)} [ ${this.trimStartSec.toFixed(2)} | ${
      this.name
    } | ${this.trimEndSec.toFixed(2)} ] ${this.endOffsetSec.toFixed(2)}`;
  }

  // interface AbstractClip

  _startOffset(): number {
    return this._startOffsetSec;
  }

  _setStartOffset(num: number): void {
    this._startOffsetSec = num;
  }

  _endOffset(): number {
    return this.endOffsetSec;
  }

  _setEndOffset(num: number): void {
    this.endOffsetSec = num;
  }

  trimToOffset(offset: number): void {
    return this.trimToOffsetSec(offset);
  }
}

export function clipMoveSec(clip: AudioClip, newOffsetSec: number, project: AudioProject, snap: boolean) {
  if (!snap) {
    clip.startOffsetSec = newOffsetSec;
    clip.notifyUpdate();
  } else {
    const tempo = project.tempo.get();
    const oneBeatLen = 60 / tempo;
    const actualNewOffsetSec = stepNumber(newOffsetSec, oneBeatLen);
    clip.startOffsetSec = actualNewOffsetSec;
    clip.notifyUpdate();
  }
}

export function clipMovePPQN(clip: MidiClip, newOffsetSec: number, project: AudioProject, snap: boolean) {
  // todo: snap arg to snap to larger grid, vs PPQN
  const bpm = project.tempo.get();

  if (!snap) {
    const pulses = secsToPulses(newOffsetSec, bpm);
    clip.startOffsetPulses = pulses;
    clip.notifyUpdate();
  } else {
    const tempo = project.tempo.get();
    const oneBeatLen = 60 / tempo;
    const actualNewOffsetSec = stepNumber(newOffsetSec, oneBeatLen);
    const pulses = secsToPulses(actualNewOffsetSec, bpm);
    clip.startOffsetPulses = pulses;
    clip.notifyUpdate();
  }
}
