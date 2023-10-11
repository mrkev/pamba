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

// rn mostly used for invariants
export interface AbstractClip {
  _startOffset(): number;
  _setStartOffset(num: number): void;

  _endOffset(): number;
  _setEndOffset(num: number): void;

  trimToOffset(offset: number): void;
  clone(): AbstractClip;
}

export class BaseClip {
  // A BaseClip represents media that has a certain length (in frames), but has
  // been trimmed to be of another length.
  readonly lengthSec: number; // seconds, whole buffer
  protected _startOffsetSec: number; // on the timeline, the x position
  protected _trimEndSec: number; // within the clip, time considered the end.
  protected _trimStartSec: number = 0; // within the clip, where to start.

  clone(): BaseClip {
    const copy = new BaseClip(this.lengthSec, this._startOffsetSec);
    copy._startOffsetSec = this._startOffsetSec;
    copy.trimEndSec = this._trimEndSec;
    copy._trimStartSec = this._trimStartSec;
    return copy;
  }

  toString() {
    return `${this.startOffsetSec} [ ${this.trimStartSec} | -- | ${this.trimEndSec} ] ${this.endOffsetSec}`;
  }

  constructor(lengthSec: number, startOffsetSec: number) {
    // By default, there is no trim and the clip has offset 0
    this.lengthSec = lengthSec;
    this._trimEndSec = lengthSec;
    this._startOffsetSec = startOffsetSec;
  }

  get startOffsetSec() {
    return this._startOffsetSec;
  }
  set startOffsetSec(secs: number) {
    this._startOffsetSec = secs;
  }

  get endOffsetSec() {
    return this.startOffsetSec + this.durationSec;
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
    if (s > this.durationSec) {
      // todo
    }

    if (s < 0) {
      throw new Error("Can't set trimEndSec to be less than 0");
    }

    this._trimEndSec = s;
  }

  get durationSec() {
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

  // Trim start to time.
  trimToOffsetSec(timeSec: number) {
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
