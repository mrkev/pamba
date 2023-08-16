import { BaseClip } from "../lib/BaseClip";
import { MutationHashable } from "../lib/state/MutationHashable";
import { Subbable, notify } from "../lib/state/Subbable";

export class MidiClip extends BaseClip implements Subbable<MidiClip>, MutationHashable {
  _hash: number = 0;
  _subscriptors: Set<(value: BaseClip) => void> = new Set();

  name: string;
  constructor(name: string, length: number) {
    // todo: sample rate doesn't really mean much for a midi clip?
    // Maybe this applies just to audio clips?
    super(length, 44_100);
    this.name = name;
  }

  // On mutation, they notify their subscribers that they changed
  public notifyUpdate() {
    MutationHashable.mutated(this);
    notify(this, this);
  }
}
