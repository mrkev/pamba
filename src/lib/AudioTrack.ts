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
import { PBGainNode } from "./offlineNodes";
import { WAMImport } from "../wam/wam";
import { PambaWamNode } from "../wam/PambaWamNode";
import nullthrows from "../utils/nullthrows";
import { appEnvironment } from "./AppEnvironment";

export class AudioTrack extends DSPNode<null> {
  // A track is a collection of non-overalping clips.
  // Invariants:
  // - Sorted by start time.
  // - Non-overlapping clips.
  public clips: LinkedArray<AudioClip>;
  public effects: LinkedArray<FaustAudioEffect | PambaWamNode>;
  public name: SPrimitive<string>;
  public height: SPrimitive<number>;

  // For background processing
  private thread = new TrackThread();

  // if audo is playing, this is the soruce with the playing buffer
  private playingSource: AudioBufferSourceNode | null;
  // The "volume" of the track
  private readonly gainNode: PBGainNode;
  // Hidden gain node, just for solo-ing tracks.
  private readonly _hiddenGainNode: PBGainNode; // note changes for bounce

  override inputNode(): null {
    return null;
  }

  override outputNode() {
    return this._hiddenGainNode;
  }

  private constructor(name: string, clips: AudioClip[], effects: (FaustAudioEffect | PambaWamNode)[], height: number) {
    super();
    this.name = SPrimitive.of(name);
    this.clips = LinkedArray.create(clips);
    this.effects = LinkedArray.create(effects);
    this.height = SPrimitive.of<number>(height);
    //
    this.playingSource = null;
    this.gainNode = new PBGainNode();
    this._hiddenGainNode = new PBGainNode();
  }

  private static trackNo = 0;
  static create(props?: {
    name?: string;
    clips?: AudioClip[];
    effects?: (FaustAudioEffect | PambaWamNode)[];
    height?: number;
  }) {
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

  async addWAM(url: string) {
    const [hostGroupId] = nullthrows(appEnvironment.wamHostGroup.get());
    const module = await PambaWamNode.fromURL(url, hostGroupId, liveAudioContext);
    if (module == null) {
      console.error("Error: NO MODULE");
      return;
    }
    this.effects.push(module);
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

    const effectNodes = this.effects._getRaw();

    connectSerialNodes([
      ///
      this.playingSource,
      this.gainNode,
      ...effectNodes,
      this._hiddenGainNode.node,
    ]);
  }

  // NOTE: needs to be called right after .prepareForPlayback
  startPlayback(offset?: number) {
    if (!this.playingSource) {
      throw new Error("Track is not ready for playback!");
    }
    this.playingSource.start(0, offset); // Play the sound now
  }

  async prepareForBounce(context: OfflineAudioContext): Promise<AudioNode> {
    this.playingSource = this.getSourceNode(context);

    const effectNodes = await Promise.all(
      this.effects._getRaw().map(async (effect) => {
        const nextEffect = await effect.cloneToOfflineContext(context);
        if (nextEffect == null) {
          throw new Error(`Failed to prepare ${effect.effectId} for bounce!`);
        }
        return nextEffect;
      })
    );

    const _hiddenGainNode = await this._hiddenGainNode.cloneToOfflineContext(context);

    connectSerialNodes([
      ///
      this.playingSource,
      await this.gainNode.cloneToOfflineContext(context),
      ...effectNodes,
      _hiddenGainNode,
    ]);

    return _hiddenGainNode.outputNode();
  }

  stopPlayback(): void {
    if (!this.playingSource) {
      console.warn("Stopping but no playingSource on track", this);
      return;
    }

    this.playingSource.stop(0);

    const chain = [
      // foo
      this.playingSource,
      this.gainNode,
      ...this.effects._getRaw(),
      this._hiddenGainNode.node,
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

  static removeEffect(track: AudioTrack, effect: FaustAudioEffect | PambaWamNode) {
    track.effects.remove(effect);
    effect.destroy();
  }

  static bypassEffect(track: AudioTrack, effect: FaustAudioEffect | PambaWamNode) {
    console.log("todo: bypass", effect);
  }

  override cloneToOfflineContext(_context: OfflineAudioContext): Promise<DSPNode<AudioNode> | null> {
    throw new Error("AudioTrack: DSPNode: can't cloneToOfflineContext.");
  }
  override effectId: string = "AUDIO TRACK (TODO)";
}

function connectSerialNodes(chain: (AudioNode | DSPNode<AudioNode>)[]): void {
  if (chain.length < 2) {
    return;
  }
  let currentNode = chain[0];
  for (let i = 1; chain[i] != null; i++) {
    const nextNode = chain[i];
    // console.groupCollapsed(`Connected: ${currentNode.constructor.name} -> ${nextNode.constructor.name}`);
    // console.log(currentNode);
    // console.log("-->");
    // console.log(nextNode);
    // console.groupEnd();
    if (currentNode instanceof AudioNode && nextNode instanceof AudioNode) {
      currentNode.connect(nextNode);
      currentNode = nextNode;
      continue;
    }
    if (currentNode instanceof AudioNode && nextNode instanceof DSPNode) {
      currentNode.connect(nextNode.inputNode());
      currentNode = nextNode;
      continue;
    }
    if (currentNode instanceof DSPNode) {
      currentNode.connect(nextNode);
      currentNode = nextNode;
      continue;
    }
  }
}
