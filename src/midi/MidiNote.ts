import { InitFunctions, JSONOfAuto, ReplaceFunctions, Structured } from "structured-state";
import { NoteT } from "./SharedMidiTypes";

type AutoMidiNote = {
  tick: number;
  number: number;
  duration: number;
  velocity: number;
};

export class MidiNote extends Structured<AutoMidiNote, typeof MidiNote> {
  constructor(
    //
    private _tick: number,
    private _number: number,
    private _duration: number,
    private _velocity: number,
  ) {
    super();
  }

  override autoSimplify(): AutoMidiNote {
    return {
      tick: this._tick,
      number: this._number,
      duration: this._duration,
      velocity: this._velocity,
    };
  }

  override replace(json: JSONOfAuto<AutoMidiNote>, replace: ReplaceFunctions): void {
    throw new Error("Unimplemented");
  }

  static construct(auto: JSONOfAuto<AutoMidiNote>, init: InitFunctions): MidiNote {
    return Structured.create(MidiNote, auto.tick, auto.number, auto.duration, auto.velocity);
  }

  static of(tick: number, number: number, duration: number, velocity: number) {
    return Structured.create(MidiNote, tick, number, duration, velocity);
  }

  // VALUES

  get tick() {
    return this._tick;
  }

  get number() {
    return this._number;
  }

  get duration() {
    return this._duration;
  }

  get velocity() {
    return this._velocity;
  }

  set tick(v: number) {
    this.featuredMutation(() => {
      this._tick = v;
    });
  }

  set number(v: number) {
    this.featuredMutation(() => {
      this._number = v;
    });
  }

  set duration(v: number) {
    this.featuredMutation(() => {
      this._duration = v;
    });
  }

  set velocity(v: number) {
    this.featuredMutation(() => {
      this._velocity = v;
    });
  }

  get t() {
    return [this.tick, this.number, this.duration, this.velocity] as NoteT;
  }

  override toString() {
    return `MN[${this.tick} ${this.number} ${this.duration} ${this.velocity}]`;
  }
}

export function mnote(notet: NoteT) {
  return MidiNote.of(...notet);
}
