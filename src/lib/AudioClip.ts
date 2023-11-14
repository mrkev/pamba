import { staticAudioContext } from "../constants";
import { dataURLForWaveform } from "../utils/waveform";
import { AbstractClip, BaseClip, Seconds } from "./BaseClip";
import { SharedAudioBuffer } from "./SharedAudioBuffer";
import { loadSound } from "./loadSound";
import { SPrimitive } from "./state/LinkedState";
import { MutationHashable } from "./state/MutationHashable";
import { Subbable, notify } from "./state/Subbable";

class AudioViewport {
  readonly pxPerSec = SPrimitive.of(10);
  readonly scrollLeft = SPrimitive.of(0);
}

// A clip of audio
export class AudioClip extends BaseClip implements Subbable<AudioClip>, MutationHashable, AbstractClip<Seconds> {
  _hash: number = 0;
  _subscriptors: Set<(value: BaseClip) => void> = new Set();

  // AudioClip
  readonly unit = "sec";
  readonly name: SPrimitive<string>;
  readonly buffer: SharedAudioBuffer;

  readonly numberOfChannels: number;
  readonly bufferURL: string;
  readonly sampleRate: number; // how many frames per second

  readonly detailedViewport = new AudioViewport();

  gainAutomation: Array<{ time: number; value: number }> = [{ time: 0, value: 1 }];
  // Let's not pre-compute this since we don't know the acutal dimensions
  // but lets memoize the last size used for perf. shouldn't change.
  private memodWaveformDataURL: Map<string, { width: number; height: number; data: string }> = new Map();

  private constructor(buffer: AudioBuffer, name: string, bufferURL: string) {
    // todo, should convert buffer.length to seconds myself? Are buffer.duration
    // and buffer.length always congruent?
    super(buffer.duration, 0);
    this.buffer = new SharedAudioBuffer(buffer);
    this.numberOfChannels = buffer.numberOfChannels;
    this.name = SPrimitive.of(name);
    this.bufferURL = bufferURL;
    this.sampleRate = buffer.sampleRate;
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
    const newClip = new AudioClip(this.buffer, this.name.get(), this.bufferURL);
    newClip.startOffsetSec = this.startOffsetSec;
    newClip.trimStartSec = this.trimStartSec;
    newClip.trimEndSec = this.trimEndSec;
    // todo: endOffsetSec?
    return newClip;
  }

  getWaveformDataURL(width: number, height: number) {
    const key = `${width}x${height}`;
    const val = this.memodWaveformDataURL.get(key);
    if (val != null) {
      return val.data;
    }

    const waveform = dataURLForWaveform(width, height, this.buffer);
    this.memodWaveformDataURL.set(key, { width, height, data: waveform });
    // console.log("generated waveform for", this.name);
    return waveform;
  }

  override toString() {
    return `${this.startOffsetSec.toFixed(2)} [ ${this.trimStartSec.toFixed(
      2,
    )} | ${this.name.get()} | ${this.trimEndSec.toFixed(2)} ] ${this.endOffsetSec.toFixed(2)}`;
  }

  // Frames units

  private secToFr(sec: number): number {
    return Math.floor(sec * this.sampleRate);
  }

  private frToSec(fr: number): Seconds {
    return (fr / this.sampleRate) as Seconds;
  }

  get lengthFr(): number {
    return this.secToFr(this.lengthSec);
  }

  // Offset relates to the clip in the timeline
  // Pos referes to the position the audio-clip plays in an audio file
  get startOffsetFr() {
    return this.secToFr(this._startOffsetSec);
  }

  set startOffsetFr(frs: number) {
    this._startOffsetSec = this.frToSec(frs);
  }

  // on the timeline, the x position where + width (duration)
  get endOffsetFr() {
    return this.startOffsetFr + this.durationFr;
  }

  get trimEndFr() {
    return this.secToFr(this._trimEndSec);
  }

  set trimEndFr(f: number) {
    this._trimEndSec = this.frToSec(f);
  }

  get durationFr() {
    return this.secToFr(this.getDuration());
  }

  get trimStartFr() {
    return this.secToFr(this._trimStartSec);
  }

  set trimStartFr(f: number) {
    this._trimStartSec = this.frToSec(f);
  }

  // interface AbstractClip

  get _startOffsetU(): Seconds {
    return this._startOffsetSec;
  }

  _setStartOffsetU(num: Seconds): void {
    this._startOffsetSec = num;
  }

  get _endOffsetU(): Seconds {
    return this.endOffsetSec as Seconds;
  }

  _setEndOffsetU(num: number): void {
    this.endOffsetSec = num;
  }

  trimToOffset(timeSec: number): void {
    return this.trimToOffsetSec(timeSec);
  }

  // Trim start to time.
  trimToOffsetSec(timeSec: number): void {
    if (timeSec < this.startOffsetSec) {
      // can't grow back past beggining of clip audio
      return;
    }

    if (timeSec > this.endOffsetSec) {
      throw new Error("trimming past end time");
    }

    const delta = timeSec - this.startOffsetSec;

    this.startOffsetSec = timeSec;
    this.trimStartSec = this.trimStartSec + delta;
  }
}
