import { loadSound } from "./lib/loadSound";
import { dataURLForWaveform } from "./lib/waveform";
import { audioContext } from "./globals";

// A clip of audio
export class AudioClip {
  readonly buffer: AudioBuffer;
  readonly lengthSec: number; // seconds, whole buffer
  readonly length: number; // frames, whole buffer

  readonly numberOfChannels: number;
  readonly sampleRate: number;

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

  private secToFr(sec: number): number {
    return Math.floor(sec * this.sampleRate);
  }

  private frToSec(fr: number): number {
    return fr / this.sampleRate;
  }

  // Offset relates to the clip in the timeline
  // Pos referes to the position the audio-clip plays in an audio file

  // on the timeline, the x position
  _startOffsetSec: number = 0;
  get startOffsetFr() {
    return this.secToFr(this._startOffsetSec);
  }
  get startOffsetSec() {
    return this._startOffsetSec;
  }
  set startOffsetSec(secs: number) {
    this._startOffsetSec = secs;
  }
  set startOffsetFr(frs: number) {
    this._startOffsetSec = this.frToSec(frs);
  }

  // on the timeline, the x position where + width (duration)
  get endOffsetFr() {
    return this.startOffsetFr + this.durationFr;
  }
  get endOffsetSec() {
    return this.startOffsetSec + this.durationSec;
  }
  set endOffsetSec(secs: number) {
    if (secs < this.startOffsetSec) {
      throw new Error("Can't set endOffsetSec to be before startOffsetSec");
    }

    //                    [          clip           ]
    //                    +--------trimEndSec--------+
    // +--startOffsetSec--+
    // +---------------endOffsetSec-----------------+
    // ^0:00
    this._trimEndSec = secs - this.startOffsetSec;
    // TODO: verify if I have to do anything with trimStartSec
  }

  // Within the clip, time is considered the end.
  // min is 0, max is duration.
  // always is > trimStartSec
  _trimEndSec: number;
  get trimEndSec() {
    return this._trimEndSec;
  }
  get trimEndFr() {
    return this.secToFr(this._trimEndSec);
  }
  set trimEndSec(s: number) {
    if (s > this.durationSec) {
      // todo
    }

    if (s < 0) {
      throw new Error("Can't set trimEndSec to be less than 0");
    }

    this._trimEndSec = s;
  }
  set trimEndFr(f: number) {
    this._trimEndSec = this.frToSec(f);
  }

  get durationSec() {
    return this._trimEndSec - this._trimStartSec;
  }
  get durationFr() {
    return this.secToFr(this.durationSec);
  }

  // within the clip, where to start.
  // min is 0, max is duration
  // always < trimEndSec
  _trimStartSec: number = 0;
  get trimStartSec() {
    return this._trimStartSec;
  }
  get trimStartFr() {
    return this.secToFr(this._trimStartSec);
  }
  set trimStartSec(s: number) {
    if (s > this.lengthSec) {
      throw new Error("Can't set trimStartSec to be more than duration");
    }

    this._trimStartSec = s;
  }
  set trimStartFr(f: number) {
    this._trimStartSec = this.frToSec(f);
  }

  constructor(buffer: AudioBuffer, name: string = "untitled") {
    this.buffer = buffer;
    this.lengthSec = buffer.duration;
    this.length = buffer.length;
    this.sampleRate = buffer.sampleRate;
    this.numberOfChannels = buffer.numberOfChannels;
    this.name = name;
    this._trimEndSec = buffer.duration;
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
