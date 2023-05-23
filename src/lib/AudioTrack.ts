import { FaustAudioEffect } from "../dsp/FaustAudioEffect";
import { EffectID } from "../dsp/FAUST_EFFECTS";
import { CLIP_HEIGHT, liveAudioContext } from "../constants";
import { mixDown } from "../mixDown";
import AudioClip from "./AudioClip";
import { addClip, deleteTime, pushClip, removeClip } from "./AudioTrackFn";
import { LinkedArray } from "./state/LinkedArray";
import { SPrimitive } from "./state/LinkedState";
import { TrackThread } from "./TrackThread";
import { DSPNode } from "../dsp/DSPNode";

export class AudioTrack extends DSPNode<null> {
  // A track is a collection of non-overalping clips.
  // Invariants:
  // - Sorted by start time.
  // - Non-overlapping clips.
  public clips: LinkedArray<AudioClip>;
  public effects: LinkedArray<FaustAudioEffect>;
  public name: SPrimitive<string>;
  public height: SPrimitive<number>;

  // For background processing
  private thread = new TrackThread();

  // if audo is playing, this is the soruce with the playing buffer
  private playingSource: AudioBufferSourceNode | null = null;
  // The "volume" of the track
  private gainNode: GainNode = new GainNode(liveAudioContext);
  // Hidden gain node, just for solo-ing tracks.
  private _hiddenGainNode; // note changes for bounce

  override inputNode(): null {
    return null;
  }
  override outputNode(): AudioNode {
    return this._hiddenGainNode;
  }

  private constructor(name: string, clips: AudioClip[], effects: FaustAudioEffect[], height: number) {
    super();
    this.name = SPrimitive.of(name);
    this.clips = LinkedArray.create(clips);
    this.effects = LinkedArray.create<FaustAudioEffect>(effects);
    this.height = SPrimitive.of<number>(height);
    //
    this._hiddenGainNode = new GainNode(liveAudioContext);
  }

  private static trackNo = 0;
  static create(props?: { name?: string; clips?: AudioClip[]; effects?: FaustAudioEffect[]; height?: number }) {
    return new this(
      props?.name ?? `Track ${this.trackNo++}`,
      props?.clips ?? [],
      props?.effects ?? [],
      props?.height ?? CLIP_HEIGHT
    );
  }

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

  async addEffect(effectId: EffectID) {
    const effect = await FaustAudioEffect.create(liveAudioContext, effectId);
    if (effect == null) {
      return;
    }
    this.effects.push(effect);
  }

  //////////// Playback ////////////

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
  prepareForPlayback(context: AudioContext): void {
    // We need to keep a reference to our source node for play/pause
    this.playingSource = this.getSourceNode(context);

    const effectNodes = this.effects._getRaw().map((effect) => {
      return effect.accessAudioNode();
    });

    const hiddenGainNodeValue = this._hiddenGainNode.gain.value;
    this._hiddenGainNode = new GainNode(context);
    this._hiddenGainNode.gain.value = hiddenGainNodeValue;

    connectSerialNodes([
      ///
      this.playingSource,
      this.gainNode,
      ...effectNodes,
      this._hiddenGainNode,
    ]);
  }

  // NOTE: needs to be called right after .prepareForPlayback
  startPlayback(offset?: number) {
    if (!this.playingSource) {
      throw new Error("Track is not ready for playback!");
    }
    this.playingSource.start(0, offset); // Play the sound now
  }

  async prepareForBounce(context: OfflineAudioContext): Promise<void> {
    this.playingSource = this.getSourceNode(context);

    const effectNodes = await Promise.all(
      this.effects._getRaw().map(async (effect) => {
        const nextEffect = await effect.cloneToOfflineContext(context);
        if (nextEffect == null) {
          throw new Error(`Failed to prepare ${effect.effectId} for bounce!`);
        }
        return nextEffect.accessAudioNode();
      })
    );

    const hiddenGainNodeValue = this._hiddenGainNode.gain.value;
    this._hiddenGainNode = new GainNode(context);
    this._hiddenGainNode.gain.value = hiddenGainNodeValue;

    connectSerialNodes([
      ///
      this.playingSource,
      // cant use gainNode, wrong context
      // this.gainNode,
      ...effectNodes,
      // cant use _hiddenGainNode, wrong context
      this._hiddenGainNode,
      // this.outNode,
    ]);
  }

  stopPlayback(): void {
    if (!this.playingSource) {
      console.warn("Stopping but no playingSource on track", this);
      return;
    }

    this.playingSource.stop(0);

    const chain = [
      this.playingSource,
      this.gainNode,
      ...this.effects._getRaw().map((effect) => effect.accessAudioNode()),
      this._hiddenGainNode,
    ];

    for (let i = 0; i < chain.length - 1; i++) {
      const currentNode = chain[i];
      const nextNode = chain[i + 1];
      currentNode.disconnect(nextNode);
    }
  }

  // TODO: I think I can keep 'trackBuffer' between plays
  private getSourceNode(context: BaseAudioContext): AudioBufferSourceNode {
    const trackBuffer = mixDown(this.clips._getRaw(), 2);
    const sourceNode = context.createBufferSource();
    sourceNode.buffer = trackBuffer;
    sourceNode.loop = false;
    return sourceNode;
  }

  //////////// UTILITY ////////////

  // New track with a single clip
  static fromClip(clip: AudioClip) {
    const track = AudioTrack.create();
    track.pushClip(clip);
    return track;
  }

  override toString() {
    return this.clips
      ._getRaw()
      .map((c) => c.toString())
      .join("\n");
  }

  //////////// CLIPS ////////////

  addClip(newClip: AudioClip): void {
    const clips = addClip(newClip, this.clips._getRaw());
    this.clips._setRaw(clips);
  }

  // Adds a clip right after the last clip
  pushClip(newClip: AudioClip): void {
    const clips = pushClip(newClip, this.clips._getRaw());
    this.clips._setRaw(clips);
  }

  removeClip(clip: AudioClip): void {
    const clips = removeClip(clip, this.clips._getRaw());
    this.clips._setRaw(clips);
  }

  deleteTime(startSec: number, endSec: number): void {
    const clips = deleteTime(startSec, endSec, this.clips._getRaw());
    this.clips._setRaw(clips);
  }

  ///////////// statics

  static removeEffect(track: AudioTrack, effect: FaustAudioEffect) {
    track.effects.remove(effect);
    effect.destroy();
  }

  static bypassEffect(track: AudioTrack, effect: FaustAudioEffect) {
    console.log("todo: bypass", effect);
  }
}

function connectSerialNodes(chain: AudioNode[]): void {
  if (chain.length < 2) {
    return;
  }
  let currentNode: AudioNode = chain[0];
  for (let i = 1; chain[i] != null; i++) {
    const nextNode = chain[i];
    // console.group(`Connected: ${currentNode.constructor.name} -> ${nextNode.constructor.name}`);
    // console.log(currentNode);
    // console.log("-->");
    // console.log(nextNode);
    // console.groupEnd();
    currentNode.connect(nextNode);
    currentNode = nextNode;
  }
}
