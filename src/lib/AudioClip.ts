import { SPrimitive, Structured } from "structured-state";
import { staticAudioContext } from "../constants";
import { AudioPackage } from "../data/AudioPackage";
import { SAudioClip } from "../data/serializable";
import { AudioViewport } from "../ui/AudioViewport";
import { nullthrows } from "../utils/nullthrows";
import { dataURLForWaveform } from "../utils/waveform";
import { AbstractClip, Seconds, secs } from "./AbstractClip";
import { SharedAudioBuffer } from "./SharedAudioBuffer";
import { SOUND_LIB_FOR_HISTORY, loadSound, loadSoundFromAudioPackage } from "./loadSound";
import { TimelineT, time } from "./project/TimelineT";

// A clip of Audio. Basic topology:
//
//                        [~~~|====== clip ========|~~~]
// bufferLength:          +----------------------------+
// bufferOffset:          +---+
//                          + | - // buffer offset positive, means we cut form clip start, negative is invalid
// trimEndSec:            +------------------------+ // doesn't exist anymore
// +--timelineStartSec--------+
// clipLength                 +--------------------+
// +--timelineEndSec-------------------------------+
//
// These properties represent media that has a certain length (in frames), but has
// been trimmed to be of another length.
export class AudioClip extends Structured<SAudioClip, typeof AudioClip> implements AbstractClip<Seconds> {
  // constants
  readonly unit = "sec";
  readonly buffer: SharedAudioBuffer | null;
  readonly numberOfChannels: number;
  readonly bufferURL: string;
  readonly sampleRate: number; // how many frames per second

  // status, from construction
  readonly status: "ready" | "missing";
  readonly detailedViewport = new AudioViewport(80, 0);
  // Let's not pre-compute this since we don't know the acutal dimensions
  // but lets memoize the last size used for perf. shouldn't change.
  private readonly memodWaveformDataURL: Map<string, { width: number; height: number; data: string }> = new Map();

  // AudioClip
  readonly name: SPrimitive<string>;
  readonly timelineStart: TimelineT; // on the timeline, the x position
  readonly timelineLength: TimelineT; // length of the clip on the timeline

  //
  // min is 0, max is duration
  public bufferOffset: Seconds; // todo: make linked state
  readonly bufferLength: Seconds; // seconds, whole buffer

  // public clipLengthSec: Seconds; // TODO: incorporate?

  // unused
  public gainAutomation: Array<{ time: number; value: number }> = [{ time: 0, value: 1 }];

  override serialize(): SAudioClip {
    const { name, bufferURL } = this;
    const result: SAudioClip = {
      kind: "AudioClip",
      name: name.get(),
      bufferURL,
      bufferOffset: this.bufferOffset,
      timelineStartSec: this.timelineStartSec,
      clipLengthSec: this.timelineLength.ensureSecs(),
    };
    return result;
  }

  override replace(json: SAudioClip): void {
    this.name.set(json.name);
    // note: can't change bufferURL, length. They're readonly to the audio buffer. Should be ok
    // cause audio buffer never changes, and all clips that replace this one will be the same buffer
    this.bufferOffset = secs(json.bufferOffset);
    this.timelineStart.set(json.timelineStartSec, "seconds");
    this.timelineLength.set(json.clipLengthSec, "seconds"); // TODO: can I use .set in replace?
  }

  static construct(json: SAudioClip): AudioClip {
    const buffer = nullthrows(SOUND_LIB_FOR_HISTORY.get(json.bufferURL));
    return Structured.create(
      AudioClip,
      buffer,
      json.name,
      json.bufferURL,
      json.bufferOffset,
      json.timelineStartSec,
      json.clipLengthSec,
    );
  }

  constructor(
    buffer: AudioBuffer | "missing",
    name: string,
    bufferURL: string,
    bufferOffset: number,
    timelineStartSec: number,
    clipLengthSec: number,
  ) {
    super();
    // TODO: make missing clips their own class, without buffer info props. They serialize to SAudioClip too
    if (buffer === "missing") {
      this.status = "missing";
      this.bufferLength = secs(10_000); // TODO: make clip unbounded by length? serialize and star buffer length when first creating a clip?
      // can help identify the clip too. Ie, when selecting media to replace this, verify that the numbers match.
      // TODO
      this.numberOfChannels = 1;
      this.sampleRate = 48000;
      this.buffer = null;
    } else {
      this.status = "ready";
      // todo, should convert buffer.length to seconds myself? Are buffer.duration
      // and buffer.length always congruent?
      // By default, there is no trim and the clip has offset 0
      this.bufferLength = secs(buffer.duration);
      this.numberOfChannels = buffer.numberOfChannels;
      this.sampleRate = buffer.sampleRate;
      this.buffer = new SharedAudioBuffer(buffer);
    }

    this.bufferOffset = secs(bufferOffset);
    this.timelineStart = time(timelineStartSec, "seconds");
    this.timelineLength = time(clipLengthSec, "seconds");

    this.name = SPrimitive.of(name);
    this.bufferURL = bufferURL;
  }

  get timelineStartSec() {
    return this.timelineStart.ensureSecs();
  }

  static async fromAudioPackage(
    audioPackage: AudioPackage,
    dimensions?: { bufferOffset: number; timelineStartSec: number; clipLengthSec: number },
  ) {
    const buffer = await loadSoundFromAudioPackage(staticAudioContext(), audioPackage);
    const bufferOffset = dimensions?.bufferOffset ?? 0;
    const timelineStartSec = dimensions?.timelineStartSec ?? 0;
    const clipLengthSec = dimensions?.clipLengthSec ?? buffer.length / buffer.sampleRate;
    return Structured.create(
      AudioClip,
      buffer,
      audioPackage.name || "untitled",
      audioPackage.url().toString(),
      bufferOffset,
      timelineStartSec,
      clipLengthSec,
    );
  }

  static async fromURL(
    url: string,
    name?: string,
    dimensions?: { bufferOffset: number; timelineStartSec: number; clipLengthSec: number },
  ) {
    const buffer = await loadSound(staticAudioContext(), url);
    const bufferOffset = dimensions?.bufferOffset ?? 0;
    const timelineStartSec = dimensions?.timelineStartSec ?? 0;
    const clipLengthSec = dimensions?.clipLengthSec ?? buffer.length / buffer.sampleRate;
    return Structured.create(AudioClip, buffer, name || "untitled", url, bufferOffset, timelineStartSec, clipLengthSec);
  }

  async fromMissingMedia(
    url: string,
    dimensions: { bufferOffset: number; timelineStartSec: number; clipLengthSec: number },
    name?: string,
  ) {
    const bufferOffset = dimensions?.bufferOffset;
    const timelineStartSec = dimensions?.timelineStartSec;
    const clipLengthSec = dimensions?.clipLengthSec;
    return Structured.create(
      AudioClip,
      "missing",
      name || "untitled",
      url,
      bufferOffset,
      timelineStartSec,
      clipLengthSec,
    );
  }

  static fromBuffer(
    buffer: AudioBuffer,
    url: string, // necessary to serialize
    name?: string,
    dimensions?: { bufferOffset: number; timelineStartSec: number; clipLengthSec: number },
  ) {
    const bufferOffset = dimensions?.bufferOffset ?? 0;
    const timelineStartSec = dimensions?.timelineStartSec ?? 0;
    const clipLengthSec = dimensions?.clipLengthSec ?? buffer.length / buffer.sampleRate;
    return Structured.create(AudioClip, buffer, name || "untitled", url, bufferOffset, timelineStartSec, clipLengthSec);
  }

  clone(): AudioClip {
    const newClip = Structured.create(
      AudioClip,
      this.buffer ?? "missing",
      this.name.get(),
      this.bufferURL,
      this.bufferOffset,
      this.timelineStartSec,
      this.timelineLength.ensureSecs(),
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

  getTimelineEndSec() {
    return this.timelineStart.ensureSecs() + this.timelineLength.ensureSecs();
  }

  setTimelineEndSec(newEnd: number) {
    const newLen = newEnd - this.timelineStart.ensureSecs();

    if (newLen <= 0) {
      throw new Error("New clip length can't be <= zero");
    }

    //
    //                  |~~~~[        clip       ]~~~~~~~~~~|
    // >--timelineStartSec---+
    //                       >-----clipLength----+
    // >-------------timelineEndSec--------------+
    //                  >-BO-+
    // ^0:00

    if (newEnd > this.timelineStartSec + this.bufferLength - this.bufferOffset) {
      console.log(
        newEnd,
        this.timelineStartSec + this.bufferLength - this.bufferOffset,
        `${this.timelineStartSec} + ${this.bufferLength} - ${this.bufferOffset}`,
      );
      throw new Error("new end too long");
      // TODO: make newEnd = this.timelineStartSec + this.lengthSec + this.bufferOffset
    }
    this.featuredMutation(() => {
      // this.clipLengthSec = newLen as Seconds;
      this.timelineLength.set(newLen, "seconds");
    });
  }

  // Frames units

  private secToFr(sec: number): number {
    return Math.floor(sec * this.sampleRate);
  }

  private frToSec(fr: number): Seconds {
    return (fr / this.sampleRate) as Seconds;
  }

  public bufferOffsetFr() {
    return this.secToFr(this.bufferOffset);
  }

  public timelineStartFr() {
    return this.secToFr(this.timelineStart.ensureSecs());
  }

  public clipLengthFr() {
    return this.secToFr(this.timelineLength.ensureSecs());
  }

  // interface AbstractClip

  get _timelineStartU(): Seconds {
    const timelineStartSec = this.timelineStart.ensureSecs();
    return timelineStartSec as Seconds;
  }

  _setTimelineStartU(num: Seconds): void {
    this.timelineStart.set(num, "seconds");
  }

  get _timelineEndU(): Seconds {
    return this.getTimelineEndSec() as Seconds;
  }

  _setTimelineEndU(num: number): void {
    this.featuredMutation(() => {
      this.setTimelineEndSec(num);
    });
  }

  trimStartToTimelineU(timeSec: number): void {
    return this.trimStartToTimelineSec(timeSec);
  }

  // Trim start to time.
  private trimStartToTimelineSec(newTimelineSec: number): void {
    if (newTimelineSec < this.bufferTimelineStartSec()) {
      // can't grow back past beggining of clip audio buffer
      return;
    }

    if (newTimelineSec > this.bufferTimelineEndSec()) {
      throw new Error(`trimming past end time: ${newTimelineSec} > ${this.bufferTimelineEndSec()}`);
    }

    const timelineStartSec = this.timelineStart.ensureSecs();
    const delta = newTimelineSec - timelineStartSec;
    this.timelineStart.set(newTimelineSec, "seconds");
    this.bufferOffset = (this.bufferOffset + delta) as Seconds;
    const clipLengthSec = this.timelineLength.ensureSecs();
    this.timelineLength.set(clipLengthSec - delta, "seconds");
  }

  // Buffer

  private bufferTimelineStartSec() {
    return this.timelineStart.ensureSecs() - this.bufferOffset;
  }

  private bufferTimelineEndSec() {
    return this.timelineStart.ensureSecs() - this.bufferOffset + this.bufferLength;
  }

  public bufferLenSec(): number {
    if (this.buffer == null) {
      return 10_000; // todo
    }
    return this.buffer.length / this.buffer.sampleRate;
  }

  // etc
  override toString() {
    const start = this.timelineStart.toString();
    const bo = this.bufferOffset.toFixed(2);
    const len = this.timelineLength.toString();
    return `[AudioClip.${this._id}, start:${start}, bo:${bo}, len:${len}]`;
  }
}
