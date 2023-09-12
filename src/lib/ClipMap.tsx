import { addClip, deleteTime, pushClip, removeClip } from "./AudioTrackFn";
import { BaseClip } from "./BaseClip";
import { StateChangeHandler } from "./state/LinkedState";
import { MutationHashable } from "./state/MutationHashable";
import { Subbable, notify } from "./state/Subbable";

export class ClipMap<T extends BaseClip> implements Subbable<null>, MutationHashable {
  _subscriptors = new Set<StateChangeHandler<null>>();
  _hash: number = 0;

  private readonly clipMap: Map<number, T>;

  constructor() {
    this.clipMap = new Map();
  }

  private clipsArray(): T[] {
    const entries = [...this.clipMap.entries()].sort(([tA], [tB]) => tA - tB);
    return entries.map(([, clip]) => clip);
  }

  private setFromClipsArray(arr: readonly T[]): void {
    const entries = arr.map((clip) => [clip.startOffsetSec, clip] as const); //[...this.clipMap.entries()].sort(([tA], [tB]) => tA - tB);
    this.clipMap.clear();
    for (const [t, c] of entries) {
      this.clipMap.set(t, c);
    }
    MutationHashable.mutated(this);
    notify(this, null);
  }

  addClip(newClip: T): void {
    const clips = addClip(newClip, this.clipsArray());
    this.setFromClipsArray(clips);
  }

  // Adds a clip right after the last clip
  pushClip(newClip: T): void {
    const clips = pushClip(newClip, this.clipsArray());
    this.setFromClipsArray(clips);
  }

  removeClip(clip: T): void {
    const clips = removeClip(clip, this.clipsArray());
    this.setFromClipsArray(clips);
  }

  deleteTime(startSec: number, endSec: number): void {
    const clips = deleteTime(startSec, endSec, this.clipsArray());
    this.setFromClipsArray(clips);
  }
}
