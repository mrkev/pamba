// Base clip deals with the offsets and times.
// Allows for easier testing than having to worry
// about and mock AudioContext, etc.
//
// Basic topology:
//
//
//                        [~~~|====== clip ========|~~~]
// buffer.length:         +----------------------------+
// duration:                  +--------------------+
// trimEndSec:            +------------------------+
// trimStartSec:          +---+
// +--startOffsetSec------+
// +--endOffsetSec---------------------------------+

import { Struct, StructProps, create } from "structured-state";

declare const UNIT_SECOND: unique symbol;
export type Seconds = number & { [UNIT_SECOND]: never };

declare const UNIT_PULSE: unique symbol;
export type Pulses = number & { [UNIT_PULSE]: never };

// rn mostly used for invariants
export interface AbstractClip<U extends Seconds | Pulses> {
  get _startOffsetU(): U;
  _setStartOffsetU(num: U): void;

  get _endOffsetU(): U;
  _setEndOffsetU(num: U): void;

  trimToOffset(offset: U): void;
  clone(): AbstractClip<U>;
}

export class BaseClip extends Struct<BaseClip> implements AbstractClip<Seconds> {
  // A BaseClip represents media that has a certain length (in frames), but has
  // been trimmed to be of another length.
  readonly lengthSec: number; // seconds, whole buffer
  protected _startOffsetSec: Seconds; // on the timeline, the x position
  protected _trimEndSec: number; // within the clip, time considered the end.
  protected _trimStartSec: number; // within the clip, where to start.

  override toString() {
    return `${this.startOffsetSec} [ ${this.trimStartSec} | -- | ${this.trimEndSec} ] ${this.endOffsetSec}`;
  }

  static of(lengthSec: number, startOffsetSec: number, trimStartSec: number, trimEndSec: number) {
    return create(BaseClip, { lengthSec, startOffsetSec, trimStartSec, trimEndSec });
  }

  constructor(
    props: StructProps<
      BaseClip,
      { lengthSec: number; startOffsetSec: number; trimStartSec: number; trimEndSec: number }
    >,
  ) {
    super(null); // TODO: if no SState on class expects null props. I guess this is fine though
    // By default, there is no trim and the clip has offset 0
    this.lengthSec = props.lengthSec;
    this._trimEndSec = props.trimEndSec;
    this._trimStartSec = props.trimStartSec;
    this._startOffsetSec = props.startOffsetSec as Seconds;
    // todo
    this._init(props);
  }

  get startOffsetSec() {
    return this._startOffsetSec;
  }

  set startOffsetSec(secs: number) {
    this._startOffsetSec = secs as Seconds;
  }

  get endOffsetSec() {
    return this.startOffsetSec + this.getDuration();
  }
  set endOffsetSec(newEnd: number) {
    if (newEnd < this.startOffsetSec) {
      throw new Error("Can't set endOffsetSec to be before startOffsetSec");
    }

    //
    //                    [          clip       |    ]
    //                    +--------trimEndSec--------+
    // +--startOffsetSec--+
    // +---------------endOffsetSec-------------+
    // ^0:00
    const delta = this.endOffsetSec - newEnd;
    this._trimEndSec = this._trimEndSec - delta;
    // TODO: verify if I have to do anything with trimStartSec
  }

  //
  // min is 0, max is duration.
  // always is > trimStartSec
  get trimEndSec() {
    return this._trimEndSec;
  }

  set trimEndSec(s: number) {
    if (s > this.lengthSec) {
      this._trimEndSec = this.lengthSec;
    }

    if (s < 0) {
      throw new Error("Can't set trimEndSec to be less than 0");
    }

    this._trimEndSec = s;
  }

  getDuration() {
    return this._trimEndSec - this._trimStartSec;
  }

  //
  // min is 0, max is duration
  // always < trimEndSec
  get trimStartSec() {
    return this._trimStartSec;
  }

  set trimStartSec(s: number) {
    if (s > this.lengthSec) {
      throw new Error("Can't set trimStartSec to be more than duration");
    }
    this._trimStartSec = s;
  }

  public trimStartAddingTime(addedTime: number) {
    this.featuredMutation(() => {
      this.trimStartSec += addedTime;
      this.startOffsetSec += addedTime;
    });
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

  clone(): BaseClip {
    const newClip = new BaseClip({
      lengthSec: this.lengthSec,
      startOffsetSec: this._startOffsetSec,
      trimStartSec: this._trimStartSec,
      trimEndSec: this._trimEndSec,
    });
    return newClip;
  }
}
