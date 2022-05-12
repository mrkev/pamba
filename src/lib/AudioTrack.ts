import { AudioClip } from "./AudioClip";
import { liveAudioContext } from "../globals";
import { mixDown } from "../mixDown";
import { addClip, deleteTime, removeClip, pushClip } from "./AudioTrackFn";
import { FaustAudioEffect } from "../dsp/Faust";
import { LinkedState } from "./LinkedState";
import { PannerFaustAudioEffect } from "../dsp/Faust";

let trackNo = 0;

export class AudioTrack {
  name: string = `Track ${trackNo++}`;
  // Idea: can we use a mutation counter to keep track of state changes?
  mutations: number = 0;
  // A track is a collection of non-overalping clips.
  // Invariants:
  // - Sorted by start time.
  // - Non-overlapping clips.
  clips = LinkedState.of<Array<AudioClip>>([]);
  effects = LinkedState.of<Array<FaustAudioEffect>>([]);

  // if audo is playing, this is the soruce with the playing buffer
  private playingSource: AudioBufferSourceNode | null = null;
  // The "volume" of the track
  private gainNode: GainNode = new GainNode(liveAudioContext);
  // Hidden gain node, just for solo-ing tracks.
  private _hiddenGainNode = new GainNode(liveAudioContext);
  private outNode: AudioNode | null = null;

  getCurrentGain(): AudioParam {
    return this.gainNode.gain;
  }

  setGain(val: number): void {
    this.gainNode.gain.value = val;
  }

  // to be used only when solo-ing
  _hidden_setIsMutedByApplication(muted: boolean) {
    if (muted) {
      this._hiddenGainNode.gain.value = 0;
      return;
    }
    this._hiddenGainNode.gain.value = 1;
  }

  async addEffect() {
    const effect = await PannerFaustAudioEffect.create(liveAudioContext);
    if (effect == null) {
      return;
    }
    const currentEffects = this.effects.get();
    this.effects.set(currentEffects.concat(effect));
  }

  //////////// Playback ////////////

  setAudioOut(node: AudioNode): void {
    this.outNode = node;
  }

  // Topology of DSP:
  // [ Source Node ]
  //        V
  // [ Gain Node ]
  //        V
  // [ ... Effects]
  //        V
  // [ _Hidden Gain Node (for soloing)]
  //        V
  // [ Out Node ]
  startPlayback(context: AudioContext, offset?: number): void {
    if (!this.outNode) {
      console.warn("No out node for this track!", this);
      return;
    }
    this.playingSource = this.getSourceNode(context);
    this.playingSource.connect(this.gainNode);
    // Effects
    let currentNode: AudioNode = this.gainNode;
    const effects = this.effects.get();
    for (let i = 0; i < effects.length; i++) {
      const nextNode = effects[i].node;
      currentNode.connect(nextNode);
      currentNode = nextNode;
    }
    currentNode.connect(this._hiddenGainNode);
    this._hiddenGainNode.connect(this.outNode);
    this.playingSource.start(0, offset); // Play the sound now
  }

  startPlaybackForBounce(context: OfflineAudioContext, offset?: number): void {
    if (!this.outNode) {
      console.warn("No out node for bounce on track:", this);
      return;
    }

    this.playingSource = this.getSourceNode(context);
    this.playingSource.connect(this.outNode);
    // this.playingSource.connect(this.gainNode);
    // // Effects
    // let currentNode: AudioNode = this.gainNode;
    // const effects = this.effects.get();
    // for (let i = 0; i < effects.length; i++) {
    //   const nextNode = effects[i].node;
    //   currentNode.connect(nextNode);
    //   currentNode = nextNode;
    // }
    // currentNode.connect(this._hiddenGainNode);
    // this._hiddenGainNode.connect(this.outNode);
    this.playingSource.start(0, offset); // Play the sound now
  }

  stopPlayback(): void {
    if (!this.playingSource) {
      console.warn("Stopping but no playingSource on track", this);
      return;
    }
    if (!this.outNode) {
      console.warn("Stopping but not outputing to any node", this);
      return;
    }

    this.playingSource.stop(0);

    const chain = [
      this.playingSource,
      this.gainNode,
      ...this.effects.get().map((effect) => effect.node),
      this._hiddenGainNode,
      this.outNode,
    ];

    for (let i = 0; i < chain.length - 1; i++) {
      const currentNode = chain[i];
      const nextNode = chain[i + 1];
      currentNode.disconnect(nextNode);
    }
  }

  // TODO: I think I can keep 'trackBuffer' between plays
  private getSourceNode(context: BaseAudioContext): AudioBufferSourceNode {
    const trackBuffer = mixDown(this.clips.get(), 2);
    const sourceNode = context.createBufferSource();
    sourceNode.buffer = trackBuffer;
    sourceNode.loop = false;
    return sourceNode;
  }

  //////////// UTILITY ////////////

  // New track with a single clip
  static fromClip(clip: AudioClip) {
    const track = new AudioTrack();
    track.pushClip(clip);
    return track;
  }

  toString() {
    return this.clips
      .get()
      .map((c) => c.toString())
      .join("\n");
  }

  //////////// CLIPS ////////////

  addClip(newClip: AudioClip) {
    const clips = addClip(newClip, this.clips.get());
    this.clips.set(clips);
    this.mutations++;
  }

  // Adds a clip right after the last clip
  pushClip(newClip: AudioClip): void {
    const clips = pushClip(newClip, this.clips.get());
    this.clips.set(clips);
    this.mutations++;
  }

  removeClip(clip: AudioClip): void {
    const clips = removeClip(clip, this.clips.get());
    this.clips.set(clips);
    this.mutations++;
  }

  deleteTime(startSec: number, endSec: number): void {
    const clips = deleteTime(startSec, endSec, this.clips.get());
    this.clips.set(clips);
    this.mutations++;
  }
}
