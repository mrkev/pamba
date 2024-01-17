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

// rn mostly used for invariants
export interface AbstractClip<U extends Seconds | Pulses> {
  get _timelineStartU(): U;
  _setTimelineStartU(num: U): void;

  get _timelineEndU(): U;
  _setTimelineEndU(num: U): void;

  trimToOffsetU(offset: U): void;
  clone(): AbstractClip<U>;
}

export class BaseClip extends Struct<BaseClip> implements AbstractClip<Seconds> {
  // A BaseClip represents media that has a certain length (in frames), but has
  // been trimmed to be of another length.
  readonly bufferLength: number; // seconds, whole buffer
  protected _timelineStartSec: Seconds; // on the timeline, the x position
  private _clipLengthSec: Seconds; // TODO: incorporate
  protected _bufferOffset: Seconds;

  override toString() {
    return `${this._timelineStartSec} | ${this._bufferOffset} [ ${this.clipLengthSec} ] ${this.timelineEndSec}`;
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
    this.bufferLength = props.bufferLength;
    this._bufferOffset = props.bufferOffset as Seconds;
    this._timelineStartSec = props.timelineStart as Seconds;
    this._clipLengthSec = props.clipLengthSec as Seconds;
    // todo
    this._init(props);
  }

  get timelineStartSec() {
    return this._timelineStartSec;
  }
  set timelineStartSec(secs: number) {
    this._timelineStartSec = secs as Seconds;
  }

  get clipLengthSec() {
    return this._clipLengthSec;
  }
  set clipLengthSec(num: number) {
    this._clipLengthSec = num as Seconds;
  }

  get bufferOffset() {
    return this._bufferOffset;
  }
  set bufferOffset(num: number) {
    this._bufferOffset = num as Seconds;
  }

  get timelineEndSec() {
    return this._timelineStartSec + this._clipLengthSec;
  }

  set timelineEndSec(newEnd: number) {
    const newLen = newEnd - this._timelineStartSec;

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

    if (newEnd > this._timelineStartSec + this.bufferLength - this._bufferOffset) {
      throw new Error("new end too long");
      // TODO: make newEnd = this._timelineStartSec + this.lengthSec + this._bufferOffset
    }
    this._clipLengthSec = newLen as Seconds;
  }

  //
  // min is 0, max is duration.
  // always is > trimStartSec
  get trimEndSec() {
    return this._clipLengthSec - this.bufferOffset;
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
    return this._bufferOffset;
  }

  // set trimStartSec(s: number) {

  //   if (s > this.lengthSec) {
  //     throw new Error("Can't set trimStartSec to be more than duration");
  //   }
  //   this._trimStartSec = s;
  // }

  public trimStartAddingTime(addedTime: number) {
    this.featuredMutation(() => {
      this._timelineStartSec = (this._timelineStartSec + addedTime) as Seconds;

      this._bufferOffset = (this._bufferOffset + addedTime) as Seconds;
      this._clipLengthSec = (this._clipLengthSec - addedTime) as Seconds;
    });
  }

  // interface AbstractClip

  get _timelineStartU(): Seconds {
    return this._timelineStartSec;
  }

  _setTimelineStartU(num: Seconds): void {
    this._timelineStartSec = num;
  }

  get _timelineEndU(): Seconds {
    return this.timelineEndSec as Seconds;
  }

  _setTimelineEndU(num: number): void {
    this.timelineEndSec = num;
  }

  trimToOffsetU(timeSec: number): void {
    return this.trimStartToTimelineSec(timeSec);
  }

  private bufferTimelineStartSec() {
    return this._timelineStartSec - this._bufferOffset;
  }

  private bufferTimelineEndSec() {
    return this._timelineStartSec - this._bufferOffset + this.bufferLength;
  }

  // Trim start to time.
  trimStartToTimelineSec(newTimelineSec: number): void {
    if (newTimelineSec < this.bufferTimelineStartSec()) {
      // can't grow back past beggining of clip audio buffer
      return;
    }

    if (newTimelineSec > this.bufferTimelineEndSec()) {
      throw new Error(`trimming past end time: ${newTimelineSec} > ${this.bufferTimelineEndSec()}`);
    }

    const delta = newTimelineSec - this._timelineStartSec;
    this._timelineStartSec = newTimelineSec as Seconds;

    this._bufferOffset = (this._bufferOffset + delta) as Seconds;
    this._clipLengthSec = (this._clipLengthSec - delta) as Seconds;
  }

  clone(): BaseClip {
    const newClip = new BaseClip({
      bufferLength: this.bufferLength,
      bufferOffset: this._bufferOffset,
      timelineStart: this._timelineStartSec,
      clipLengthSec: this._clipLengthSec,
    });
    return newClip;
  }
}
