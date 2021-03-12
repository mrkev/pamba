import { loadSound } from './lib/loadSound';
import { dataURLForWaveform } from './lib/waveform';
import { audioContext } from './globals';

// A clip of audio
export class AudioClip {
  readonly buffer: AudioBuffer;
  readonly lengthSec: number; // seconds, whole buffer
  readonly length: number; // frames, whole buffer

  readonly numberOfChannels: number;
  readonly sampleRate: number;

  // on the timeline, the x position
  _startOffsetSec: number = 0;
  get startOffsetFr() { return (this._startOffsetSec * this.sampleRate) >> 0; }
  get startOffsetSec() { return this._startOffsetSec; }
  set startOffsetSec(secs: number) { this._startOffsetSec = secs; }
  set startOffsetFr(frs: number) { this._startOffsetSec = frs / this.sampleRate; }

  // What time is considered the end of the clip. Should verify this is set to > startPosSec
  _endPosSec: number;
  get endPosSec() { return this._endPosSec }
  get endPosFr() { return (this._endPosSec * this.sampleRate) >> 0; }
  set endPosSec(s: number) { this._endPosSec = s; }
  set endPosFr(f: number) { this._endPosSec = f / this.sampleRate; }

  get durationSec() { return this._endPosSec - this._startPosSec; }
  get durationFr() { return ((this.durationSec * this.sampleRate) >> 0); }

  // within the clip, where to start. Should verify this is set to < endPosSec
  _startPosSec: number = 0;
  get startPosSec() { return this._startPosSec; }
  get startPosFr() { return (this._startPosSec * this.sampleRate) >> 0; }
  set startPosSec(s: number) { this._startPosSec = s; }
  set startPosFr(f: number) { this._startPosSec = f / this.sampleRate; }
  

  name: string;

  constructor(buffer: AudioBuffer, name: string = 'untitled') {
    this.buffer = buffer;
    this.lengthSec = buffer.duration;
    this.length = buffer.length;
    this.sampleRate = buffer.sampleRate;
    this.numberOfChannels = buffer.numberOfChannels;
    this.name = name;
    this._endPosSec = buffer.duration;
  }

  // Let's not pre-compute this since we don't know the acutal dimensions
  // but lets memoize the last size used for perf. shouldn't change.
  private memodWaveformDataURL: { dims: [number, number]; data: string; } = {
    dims: [0, 0],
    data: '',
  };
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
    console.log('generated waveform for', this.name);
    return waveform;
  }

  static async fromURL(url: string, name?: string) {
    const buffer = await loadSound(audioContext, url);
    return new AudioClip(buffer, name || url);
  }
}
