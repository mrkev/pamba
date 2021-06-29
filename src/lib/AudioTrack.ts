import { AudioClip } from "./AudioClip";
import { audioContext } from "../globals";
import { mixDown } from "../mixDown";
import { addClip, deleteTime, removeClip, pushClip } from "./AudioTrackFn";

let trackNo = 0;

export class AudioTrack {
  name: string = `Track ${trackNo++}`;
  // Idea: can we use a mutation counter to keep track of state changes?
  mutations: number = 0;
  // A track is a collection of non-overalping clips.
  // Invariants:
  // - Sorted by start time.
  // - Non-overlapping clips.
  clips: Array<AudioClip> = [];

  gainNode: GainNode = new GainNode(audioContext);

  getSourceNode(): AudioBufferSourceNode {
    const trackBuffer = mixDown(this.clips, 2);
    const sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = trackBuffer;
    sourceNode.loop = false;
    sourceNode.connect(this.gainNode);
    return sourceNode;
  }

  // New track with a single clip
  static fromClip(clip: AudioClip) {
    const track = new AudioTrack();
    track.pushClip(clip);
    return track;
  }

  toString() {
    return this.clips.map((c) => c.toString()).join("\n");
  }

  addClip(newClip: AudioClip) {
    console.log("adding", newClip.toString(), "\n", "into:\n", this.toString());
    addClip(newClip, this.clips);
    this.mutations++;
  }

  // Adds a clip right after the last clip
  pushClip(newClip: AudioClip): void {
    pushClip(newClip, this.clips);
    this.mutations++;
  }

  removeClip(clip: AudioClip): void {
    removeClip(clip, this.clips);
    this.mutations++;
  }

  deleteTime(startSec: number, endSec: number): void {
    deleteTime(startSec, endSec, this.clips);
    this.mutations++;
  }
}
