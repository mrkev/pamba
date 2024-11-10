import { array, InitFunctions, JSONOfAuto, ReplaceFunctions, SArray, Structured } from "structured-state";
import { time, TimelineT } from "../lib/project/TimelineT";
import { dataURLForMidiBuffer } from "../utils/midiimg";
import type { Note } from "./SharedMidiTypes";
import { nullthrows } from "../utils/nullthrows";

type SimpleMidiBuffer = {
  notes: SArray<Note>;
  len: TimelineT;
};

export class MidiBuffer extends Structured<SimpleMidiBuffer, typeof MidiBuffer> {
  private readonly memodMidiDataURL: Map<string, { width: number; height: number; data: string }> = new Map();

  constructor(
    // ordered by tick (start)
    readonly notes: SArray<Note>,
    readonly timelineLength: TimelineT,
  ) {
    super();
  }

  override replace(json: JSONOfAuto<SimpleMidiBuffer>, replace: ReplaceFunctions): void {
    replace.array(json.notes, this.notes);
    replace.structured(json.len, this.timelineLength);
  }

  override autoSimplify(): SimpleMidiBuffer {
    return {
      notes: this.notes,
      len: this.timelineLength,
    };
  }

  static construct(json: JSONOfAuto<SimpleMidiBuffer>, init: InitFunctions) {
    return Structured.create(MidiBuffer, init.array(json.notes), init.structured(json.len, TimelineT));
  }

  static of(notes: Note[], len: number) {
    return Structured.create(MidiBuffer, array(notes), time(len, "pulses"));
  }

  ////////////////////////////////////
  addOrderedNote(note: Note) {
    for (let i = 0; i < this.notes.length; i++) {
      const [tick] = nullthrows(this.notes.at(i));
      if (tick >= note[0] /* .tick */) {
        this.notes.splice(i, 0, note);
        return;
      }
    }
    this.notes.push(note);
  }

  clearCache() {
    this.memodMidiDataURL.clear();
  }

  getMidiDataURL(width: number): [string, number] {
    const key = `${width}`;
    const val = this.memodMidiDataURL.get(key);
    if (val != null) {
      return [val.data, val.height];
    }

    const [img, height] = dataURLForMidiBuffer(width, this);
    this.memodMidiDataURL.set(key, { width, height, data: img });
    return [img, height];
  }

  clone() {
    return Structured.create(MidiBuffer, array(this.notes._getRaw()), this.timelineLength.clone());
  }
}
