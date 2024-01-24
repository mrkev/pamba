// Base clip deals with the offsets and times.
// Allows for easier testing than having to worry
// about and mock AudioContext, etc.
//
// Basic topology:
//
//
//                        [~~~|====== clip ========|~~~]
// bufferLength:          +----------------------------+
// bufferOffset:          +---+
// +--timelineStartSec--------+
// clipLength                 +--------------------+
// +--timelineEndSec-------------------------------+
// trimEndSec:            +------------------------+
// trimStartSec:          +---+

import { Struct, StructProps, create } from "structured-state";

declare const UNIT_SECOND: unique symbol;
export type Seconds = number & { [UNIT_SECOND]: never };

declare const UNIT_PULSE: unique symbol;
export type Pulses = number & { [UNIT_PULSE]: never };

export function secs(num: number) {
  return num as Seconds;
}

export function secsAsNum(num: Seconds) {
  return num as number;
}

// rn mostly used for invariants
export interface AbstractClip<U extends Seconds | Pulses> {
  get _timelineStartU(): U;
  _setTimelineStartU(num: U): void;

  get _timelineEndU(): U;
  _setTimelineEndU(num: U): void;

  trimStartToTimelineU(offset: U): void;
  clone(): AbstractClip<U>;
}

export class BaseClip extends Struct<BaseClip> implements AbstractClip<Seconds> {
  readonly unit = "sec";
  // A BaseClip represents media that has a certain length (in frames), but has
  // been trimmed to be of another length.
  readonly bufferLength: Seconds; // seconds, whole buffer
  public timelineStartSec: Seconds; // on the timeline, the x position
  public clipLengthSec: Seconds; // TODO: incorporate
  public bufferOffset: Seconds;

  override toString() {
    return `${this.timelineStartSec} | ${this.bufferOffset} [ ${this.clipLengthSec} ] ${this.timelineEndSec}`;
  }

  static of(timelineStart: number, clipLengthSec: number, bufferOffset: number, bufferLength: number) {
    return create(BaseClip, { bufferLength, bufferOffset, timelineStart, clipLengthSec });
  }

  constructor(
    props: StructProps<
      BaseClip,
      { timelineStart: number; clipLengthSec: number; bufferOffset: number; bufferLength: number }
    >,
  ) {
    super(null); // TODO: if no SState on class expects null props. I guess this is fine though
    // By default, there is no trim and the clip has offset 0
    this.bufferLength = props.bufferLength as Seconds;
    this.bufferOffset = props.bufferOffset as Seconds;
    this.timelineStartSec = props.timelineStart as Seconds;
    this.clipLengthSec = props.clipLengthSec as Seconds;
    // todo
    this._init(props);
  }

  get timelineEndSec() {
    return this.timelineStartSec + this.clipLengthSec;
  }

  set timelineEndSec(newEnd: number) {
    const newLen = newEnd - this.timelineStartSec;

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
    this.clipLengthSec = newLen as Seconds;
  }

  //
  // min is 0, max is duration.
  // always is > trimStartSec
  get trimEndSec() {
    return this.clipLengthSec - this.bufferOffset;
  }

  set trimEndSec(s: number) {
    let trimEnd = s;
    if (trimEnd > this.bufferLength + this.bufferOffset) {
      trimEnd = this.bufferLength + this.bufferOffset;
    } else if (s < 0) {
      throw new Error("Can't set trimEndSec to be less than 0");
    }

    this.timelineEndSec = this.bufferTimelineStartSec() + trimEnd;
  }

  //
  // min is 0, max is duration
  // always < trimEndSec
  get trimStartSec() {
    return this.bufferOffset;
  }

  // set trimStartSec(s: number) {

  //   if (s > this.lengthSec) {
  //     throw new Error("Can't set trimStartSec to be more than duration");
  //   }
  //   this._trimStartSec = s;
  // }

  // interface AbstractClip

  get _timelineStartU(): Seconds {
    return this.timelineStartSec;
  }

  _setTimelineStartU(num: Seconds): void {
    this.timelineStartSec = num;
  }

  get _timelineEndU(): Seconds {
    return this.timelineEndSec as Seconds;
  }

  _setTimelineEndU(num: number): void {
    this.timelineEndSec = num;
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

    const delta = newTimelineSec - this.timelineStartSec;
    this.timelineStartSec = newTimelineSec as Seconds;
    this.bufferOffset = (this.bufferOffset + delta) as Seconds;
    this.clipLengthSec = (this.clipLengthSec - delta) as Seconds;
  }

  // Buffer

  private bufferTimelineStartSec() {
    return this.timelineStartSec - this.bufferOffset;
  }

  private bufferTimelineEndSec() {
    return this.timelineStartSec - this.bufferOffset + this.bufferLength;
  }

  clone(): BaseClip {
    const newClip = new BaseClip({
      bufferLength: this.bufferLength,
      bufferOffset: this.bufferOffset,
      timelineStart: this.timelineStartSec,
      clipLengthSec: this.clipLengthSec,
    });
    return newClip;
  }
}
