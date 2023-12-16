import { staticAudioContext } from "../constants";
import { SAudioClip } from "../data/serializable";
import { nullthrows } from "../utils/nullthrows";
import { dataURLForWaveform } from "../utils/waveform";
import { AbstractClip, BaseClip, Seconds } from "./BaseClip";
import { SharedAudioBuffer } from "./SharedAudioBuffer";
import { SOUND_LIB_FOR_HISTORY, loadSound } from "./loadSound";
import { SPrimitive } from "./state/LinkedState";
import { MutationHashable } from "./state/MutationHashable";
import { Subbable } from "./state/Subbable";

class AudioViewport {
  readonly pxPerSec = SPrimitive.of(10);
  readonly scrollLeft = SPrimitive.of(0);
}

// A clip of audio, this has _hash and _subscriptors from BaseClip extending Struct
export class AudioClip extends BaseClip implements Subbable<AudioClip>, MutationHashable, AbstractClip<Seconds> {
  // AudioClip
  readonly unit = "sec";
  readonly name: SPrimitive<string>;
  readonly buffer: SharedAudioBuffer;

  readonly numberOfChannels: number;
  readonly bufferURL: string;
  readonly sampleRate: number; // how many frames per second

  readonly detailedViewport = new AudioViewport();

  // Struct: override simplification
  _simplify(): SAudioClip {
    const { name, bufferURL } = this;
    const result: SAudioClip = {
      kind: "AudioClip",
      name: name.get(),
      bufferURL,
      lengthSec: this.lengthSec,
      startOffsetSec: this.startOffsetSec,
      trimStartSec: this.trimStartSec,
      trimEndSec: this.trimEndSec,
    };
    return result;
  }

  // Struct: override replacement
  _replace(json: SAudioClip) {
    this.name.set(json.name);
    // note: can't change bufferURL, length. They're readonly to the audio buffer. Should be ok
    // cause audio buffer never changes, and all clips that replace this one will be the same buffer
    this.startOffsetSec = json.startOffsetSec;
    this.trimStartSec = json.trimStartSec;
    this.trimEndSec = json.trimEndSec;
  }

  // NOTE: override construction
  static _construct(json: SAudioClip) {
    const buffer = nullthrows(SOUND_LIB_FOR_HISTORY.get(json.bufferURL));
    return new AudioClip(buffer, json.name, json.bufferURL, json.startOffsetSec, json.trimStartSec, json.trimEndSec);
  }

  gainAutomation: Array<{ time: number; value: number }> = [{ time: 0, value: 1 }];
  // Let's not pre-compute this since we don't know the acutal dimensions
  // but lets memoize the last size used for perf. shouldn't change.
  private memodWaveformDataURL: Map<string, { width: number; height: number; data: string }> = new Map();

  private constructor(
    buffer: AudioBuffer,
    name: string,
    bufferURL: string,
    startOffsetSec: number,
    trimStartSec: number,
    trimEndSec: number,
  ) {
    // todo, should convert buffer.length to seconds myself? Are buffer.duration
    // and buffer.length always congruent?
    super({ lengthSec: buffer.duration, startOffsetSec, trimStartSec, trimEndSec });
    this.buffer = new SharedAudioBuffer(buffer);
    this.numberOfChannels = buffer.numberOfChannels;
    this.name = SPrimitive.of(name);
    this.bufferURL = bufferURL;
    this.sampleRate = buffer.sampleRate;
    console.log("CREATED AUDIO", this._id);
  }

  static async fromURL(url: string, name?: string) {
    const buffer = await loadSound(staticAudioContext, url);
    return new AudioClip(buffer, name || "untitled", url, 0, 0, buffer.duration);
  }

  override clone(): AudioClip {
    const newClip = new AudioClip(
      this.buffer,
      this.name.get(),
      this.bufferURL,
      this.startOffsetSec,
      this.trimStartSec,
      this.trimEndSec,
    );
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
}
