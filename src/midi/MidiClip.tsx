import { BaseClip } from "../lib/BaseClip";
import { LinkedArray } from "../lib/state/LinkedArray";
import { MutationHashable } from "../lib/state/MutationHashable";
import { Subbable, notify } from "../lib/state/Subbable";
import nullthrows from "../utils/nullthrows";

export type Note = readonly [tick: number, number: number, duration: number, velocity: number];

export class MidiClip extends BaseClip implements Subbable<MidiClip>, MutationHashable {
  _hash: number = 0;
  _subscriptors: Set<(value: BaseClip) => void> = new Set();
  // ordered by tick (start)
  notes: LinkedArray<Note>;
  public name: string;

  constructor(name: string, length: number, notes?: readonly Note[]) {
    // todo: sample rate doesn't really mean much for a midi clip?
    // Maybe this applies just to audio clips?
    super(length, 44_100, 0);
    this.name = name;
    this.notes = LinkedArray.create(notes);
  }

  addNote(tick: number, num: number, duration: number, velocity: number) {
    addOrderedNote(this.notes, [tick, num, duration, velocity]);
  }

  removeNote(note: Note) {
    this.notes.remove(note);
  }

  // Good for now, works long term?
  findNote(tick: number, number: number) {
    return this.notes.find(([ntick, nnum]: Note) => ntick == tick && nnum == number) ?? null;
  }

  // On mutation, they notify their subscribers that they changed
  public notifyUpdate() {
    MutationHashable.mutated(this);
    notify(this, this);
  }
}

function addOrderedNote(la: LinkedArray<Note>, note: Note) {
  for (let i = 0; i < la.length; i++) {
    const [tick] = nullthrows(la.at(i));
    if (tick >= note[0] /* .tick */) {
      la.splice(i, 0, note);
      return;
    }
  }
  la.push(note);
}
