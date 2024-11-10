import { InitFunctions, JSONOfAuto, ReplaceFunctions, SString, Structured, string } from "structured-state";
import { staticAudioContext } from "../constants";
import { AudioPackage } from "../data/AudioPackage";
import { SAudioClip } from "../data/serializable";
import { nullthrows } from "../utils/nullthrows";
import { dataURLForWaveform } from "../utils/waveform";
import { AbstractClip, Seconds, secs } from "./AbstractClip";
import { SharedAudioBuffer } from "./SharedAudioBuffer";
import { SOUND_LIB_FOR_HISTORY, loadSound, loadSoundFromAudioPackage } from "./loadSound";
import { TimelineT, time } from "./project/TimelineT";
import { AudioViewport } from "./viewport/AudioViewport";

type AutoAudioClip = {
  name: SString;
  bufferURL: string;
  bufferOffset: TimelineT;
  timelineStart: TimelineT;
  timelineLength: TimelineT;
};

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
export class AudioClip extends Structured<AutoAudioClip, typeof AudioClip> implements AbstractClip<Seconds> {
  // constants
  readonly sampleRate: number; // how many frames per second

  // status, from construction
  readonly status: "ready" | "missing";
  readonly detailedViewport = AudioViewport.of(80, 0);
  // Let's not pre-compute this since we don't know the acutal dimensions
  // but lets memoize the last size used for perf. shouldn't change.
  private readonly memodWaveformDataURL: Map<string, { width: number; height: number; data: string }> = new Map();

  //
  // public bufferOffset: Seconds; // todo: make linked state
  readonly bufferLength: Seconds; // seconds, whole buffer

  // public clipLengthSec: Seconds; // TODO: incorporate?

  // unused
  public gainAutomation: Array<{ time: number; value: number }> = [{ time: 0, value: 1 }];

  constructor(
    readonly buffer: SharedAudioBuffer | null,
    readonly name: SString,
    // Buffer
    readonly bufferURL: string,
    readonly bufferOffset: TimelineT, // min is 0, max is duration, relative to clip start. TODO: make relative to timeline start?
    // AudioClip
    readonly timelineStart: TimelineT, // on the timeline, the x position
    readonly timelineLength: TimelineT, // length of the clip on the timeline
  ) {
    super();
    // TODO: make missing clips their own class, without buffer info props. They serialize to SAudioClip too
    if (buffer == null) {
      this.status = "missing";
      this.bufferLength = secs(10_000); // TODO: make clip unbounded by length? serialize and star buffer length when first creating a clip?
      // can help identify the clip too. Ie, when selecting media to replace this, verify that the numbers match.
      // TODO
      this.sampleRate = 48000;
      this.buffer = null;
    } else {
      this.status = "ready";
      // todo, should convert buffer.length to seconds myself? Are buffer.duration
      // and buffer.length always congruent?
      // By default, there is no trim and the clip has offset 0
      this.bufferLength = secs(buffer.duration);
      this.sampleRate = buffer.sampleRate;
    }

    this.bufferOffset = bufferOffset;
  }

  // experimental
  // note: kind infered from the field at construction time
  override autoSimplify(): AutoAudioClip {
    return {
      name: this.name,
      bufferURL: this.bufferURL,
      bufferOffset: this.bufferOffset,
      timelineStart: this.timelineStart,
      timelineLength: this.timelineLength,
    };
  }

  override replace(auto: JSONOfAuto<AutoAudioClip>, replace: ReplaceFunctions): void {
    replace.string(auto.name, this.name);
    replace.structured(auto.bufferOffset, this.bufferOffset);
    replace.structured(auto.timelineStart, this.timelineStart);
    replace.structured(auto.timelineLength, this.timelineLength);
    // note: can't change bufferURL, length. They're readonly to the audio buffer. Should be ok
    // cause audio buffer never changes, and all clips that replace this one will be the same buffer
  }

  static construct(auto: JSONOfAuto<AutoAudioClip>, init: InitFunctions): AudioClip {
    const buffer = nullthrows(SOUND_LIB_FOR_HISTORY.get(auto.bufferURL));
    return Structured.create(
      AudioClip,
      buffer,
      init.string(auto.name),
      auto.bufferURL,
      init.structured(auto.bufferOffset, TimelineT),
      init.structured(auto.timelineStart, TimelineT),
      init.structured(auto.timelineLength, TimelineT),
    );
  }

  static of(json: SAudioClip): AudioClip {
    const buffer = nullthrows(SOUND_LIB_FOR_HISTORY.get(json.bufferURL));
    return Structured.create(
      AudioClip,
      buffer,
      string(json.name),
      json.bufferURL,
      time(json.bufferOffset, "seconds"),
      time(json.timelineStartSec, "seconds"),
      time(json.clipLengthSec, "seconds"),
    );
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
      string(audioPackage.name || "untitled"),
      audioPackage.url().toString(),
      time(bufferOffset, "seconds"),
      time(timelineStartSec, "seconds"),
      time(clipLengthSec, "seconds"),
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
    return Structured.create(
      AudioClip,
      buffer,
      string(name || "untitled"),
      url,
      time(bufferOffset, "seconds"),
      time(timelineStartSec, "seconds"),
      time(clipLengthSec, "seconds"),
    );
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
      null,
      string(name || "untitled"),
      url,
      time(bufferOffset, "seconds"),
      time(timelineStartSec, "seconds"),
      time(clipLengthSec, "seconds"),
    );
  }

  static fromBuffer(
    buffer: SharedAudioBuffer,
    url: string, // necessary to serialize
    name?: string,
    dimensions?: { bufferOffset: number; timelineStartSec: number; clipLengthSec: number },
  ) {
    const bufferOffset = dimensions?.bufferOffset ?? 0;
    const timelineStartSec = dimensions?.timelineStartSec ?? 0;
    const clipLengthSec = dimensions?.clipLengthSec ?? buffer.length / buffer.sampleRate;
    return Structured.create(
      AudioClip,
      buffer,
      string(name || "untitled"),
      url,
      time(bufferOffset, "seconds"),
      time(timelineStartSec, "seconds"),
      time(clipLengthSec, "seconds"),
    );
  }

  clone(): AudioClip {
    const newClip = Structured.create(
      AudioClip,
      this.buffer, // todo: we reference the same buffer to avoid the cost of creating the buffers and the renderer. Is this ok?
      string(this.name.get()),
      this.bufferURL,
      this.bufferOffset.clone(),
      this.timelineStart.clone(),
      this.timelineLength.clone(),
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

    if (newEnd > this.timelineStartSec + this.bufferLength - this.bufferOffset.ensureSecs()) {
      // console.log(
      //   newEnd,
      //   this.timelineStartSec + this.bufferLength - this.bufferOffset.ensureSecs(),
      //   `${this.timelineStartSec} + ${this.bufferLength} - ${this.bufferOffset}`,
      // );
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
    return this.secToFr(this.bufferOffset.ensureSecs());
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

    this.featuredMutation(() => {
      const timelineStartSec = this.timelineStart.ensureSecs();
      const delta = newTimelineSec - timelineStartSec;
      this.timelineStart.set(newTimelineSec, "seconds");
      this.bufferOffset.set(this.bufferOffset.ensureSecs() + delta, "seconds");
      const clipLengthSec = this.timelineLength.ensureSecs();
      this.timelineLength.set(clipLengthSec - delta, "seconds");
    });
  }

  // Buffer

  private bufferTimelineStartSec() {
    return this.timelineStart.ensureSecs() - this.bufferOffset.ensureSecs();
  }

  private bufferTimelineEndSec() {
    return this.timelineStart.ensureSecs() - this.bufferOffset.ensureSecs() + this.bufferLength;
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
    const bo = this.bufferOffset.toString();
    const len = this.timelineLength.toString();
    return `[AudioClip.${this._id}, start:${start}, bo:${bo}, len:${len}]`;
  }
}
