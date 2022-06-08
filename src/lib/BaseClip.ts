// Base clip deals with the offsets and times.
// Allows for easier testing than having to worry
// about and mock AudioContext, etc.
//
//  Basic topology:
//
//
//                    [~~~|====== clip ========|~~~]
// length:            +----------------------------+
// duration:              +--------------------+
// trimEndSec:        +------------------------+
// trimStartSec:      +---+
// +--startOffsetSec--+
// +--endOffsetSec-----------------------------+

export class BaseClip {
  // A BaseClip represents media that has a certain length (in frames), but has
  // been trimmed to be of another length.
  readonly lengthSec: number; // seconds, whole buffer
  readonly sampleRate: number; // how many frames per second
  protected _startOffsetSec: number = 0; // on the timeline, the x position
  protected _trimEndSec: number; // within the clip, time considered the end.
  protected _trimStartSec: number = 0; // within the clip, where to start.

  clone(): BaseClip {
    const copy = new BaseClip({
      lengthSec: this.lengthFr,
      sampleRate: this.sampleRate,
    });
    copy._startOffsetSec = this._startOffsetSec;
    copy.trimEndSec = this._trimEndSec;
    copy._trimStartSec = this._trimStartSec;
    return copy;
  }

  toString() {
    return `${this.startOffsetSec} [ ${this.trimStartSec} | -- | ${this.trimEndSec} ] ${this.endOffsetSec}`;
  }

  constructor({ lengthSec, sampleRate }: { lengthSec: number; sampleRate: number }) {
    // By default, there is no trim and the clip has offset 0
    this.lengthSec = lengthSec;
    this.sampleRate = sampleRate;
    this._trimEndSec = lengthSec;
  }

  private secToFr(sec: number): number {
    return Math.floor(sec * this.sampleRate);
  }

  private frToSec(fr: number): number {
    return fr / this.sampleRate;
  }

  get lengthFr(): number {
    return this.secToFr(this.lengthSec);
  }

  // Offset relates to the clip in the timeline
  // Pos referes to the position the audio-clip plays in an audio file
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

  //
  // min is 0, max is duration
  // always < trimEndSec
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

  moveToOffsetSec(s: number) {
    this.startOffsetSec = s;
  }

  trimToOffsetSec(timeSec: number) {
    if (timeSec < this.startOffsetSec) {
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
