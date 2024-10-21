import { SArray } from "structured-state";
import { TimelineT } from "../lib/project/TimelineT";
import { dataURLForMidiBuffer } from "../utils/midiimg";
import type { Note } from "./SharedMidiTypes";

export class MidiBuffer {
  constructor(
    // ordered by tick (start)
    readonly notes: SArray<Note>,
    readonly len: TimelineT,
  ) {}

  private readonly memodMidiDataURL: Map<string, { width: number; height: number; data: string }> = new Map();
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
}
