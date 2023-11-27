import { SSchemaArray } from "structured-state";
import { liveAudioContext } from "../constants";
import { DSPNode } from "../dsp/DSPNode";
import { EffectID } from "../dsp/FAUST_EFFECTS";
import { FaustAudioEffect } from "../dsp/FaustAudioEffect";
import { nullthrows } from "../utils/nullthrows";
import { PambaWamNode } from "../wam/PambaWamNode";
import { appEnvironment } from "./AppEnvironment";
import { AbstractClip } from "./BaseClip";
import { addClip, deleteTime, pushClip, removeClip, splitClip } from "./BaseClipFn";
import { connectSerialNodes } from "./connectSerialNodes";
import { AudioContextInfo } from "./initAudioContext";
import { PBGainNode } from "./offlineNodes";
import type { AudioProject } from "./project/AudioProject";
import { LinkedArray } from "./state/LinkedArray";
import { SPrimitive } from "./state/LinkedState";

export abstract class ProjectTrack<T extends AbstractClip<any>> extends DSPNode<null> {
  public readonly name: SPrimitive<string>;
  public readonly height: SPrimitive<number>;

  abstract prepareForPlayback(context: AudioContext): void;
  abstract prepareForBounce(context: OfflineAudioContext, offlineContextInfo: AudioContextInfo): Promise<AudioNode>;

  // NOTE: needs to be called right after .prepareForPlayback
  abstract startPlayback(tempo: number, context: BaseAudioContext, offset?: number): void;
  abstract stopPlayback(context: BaseAudioContext): void;

  // A track is a collection of non-overalping clips.
  // Invariants:
  // - Sorted by start time.
  // - Non-overlapping clips.
  public abstract readonly clips: SSchemaArray<any>; // TODO: <T>, not there cause midi clip isn't ready

  // DSP
  public readonly effects: LinkedArray<FaustAudioEffect | PambaWamNode>;
  // The "volume" of the track
  public readonly gainNode: PBGainNode;
  // Hidden gain node, just for solo-ing tracks.
  public readonly _hiddenGainNode: PBGainNode;

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

  constructor(name: string, effects: (FaustAudioEffect | PambaWamNode)[], height: number) {
    super();
    this.name = SPrimitive.of(name);
    this.effects = LinkedArray.create(effects);
    this.height = SPrimitive.of<number>(height);
    this.gainNode = new PBGainNode();
    this._hiddenGainNode = new PBGainNode();
  }

  public connectToDSPForPlayback(source: AudioNode): void {
    // We need to keep a reference to our source node for play/pause

    const effectNodes = this.effects._getRaw();
    connectSerialNodes([
      ///
      source,
      ...effectNodes,
      this.gainNode,
      this._hiddenGainNode.node,
    ]);
  }

  public disconnectDSPAfterPlayback(source: AudioNode): void {
    const chain = [
      // foo
      source,
      ...this.effects._getRaw(),
      this.gainNode,
      this._hiddenGainNode.node,
    ];

    for (let i = 0; i < chain.length - 1; i++) {
      const currentNode = chain[i];
      const nextNode = chain[i + 1];
      currentNode.disconnect(nextNode);
    }
  }

  override inputNode(): null {
    return null;
  }

  override outputNode() {
    return this._hiddenGainNode;
  }

  override cloneToOfflineContext(_context: OfflineAudioContext): Promise<DSPNode<AudioNode> | null> {
    throw new Error("AudioTrack: DSPNode: can't cloneToOfflineContext.");
  }

  //////////// CLIPS ////////////

  addClip(project: AudioProject, newClip: T): void {
    if (!project.canEditTrack(project, this)) {
      return;
    }

    addClip(newClip, this.clips);
    // this.clips._setRaw(clips);
  }

  // Adds a clip right after the last clip
  pushClip(project: AudioProject, newClip: T): void {
    if (!project.canEditTrack(project, this)) {
      return;
    }

    pushClip(newClip, this.clips);
    // this.clips._setRaw(clips as any);
  }

  // // TODO: UNUSED
  // moveClip(clip: T): void {
  //   moveClip(clip, this.clips);
  //   // this.clips._setRaw(clips as any);
  // }

  removeClip(project: AudioProject, clip: T): void {
    if (!project.canEditTrack(project, this)) {
      return;
    }

    removeClip(clip, this.clips);
    // this.clips._setRaw(clips);
  }

  deleteTime(project: AudioProject, start: number, end: number): void {
    if (!project.canEditTrack(project, this)) {
      return;
    }

    deleteTime(start, end, this.clips);
    // this.clips._setRaw(clips);
  }

  splitClip(project: AudioProject, clip: T, offset: number): void {
    if (!project.canEditTrack(project, this)) {
      return;
    }

    splitClip(clip, offset, this.clips);
  }

  //////////////////// EFFECTS //////////////////////

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

  /////////////// DEBUGGING /////////////////

  override toString() {
    return this.clips
      ._getRaw()
      .map((c) => c.toString())
      .join("\n");
  }
}

export class TrackUtilityDSP extends DSPNode<AudioNode> {
  override effectId = "TrackUtility";
  override name = "TrackUtility";

  // The "volume" of the track
  private readonly gainNode: PBGainNode;
  // Hidden gain node, just for solo-ing tracks.
  private readonly _hiddenGainNode: PBGainNode; // note changes for bounce

  private constructor(gainNode: PBGainNode, hiddenGainNode: PBGainNode) {
    super();
    this.gainNode = gainNode;
    this._hiddenGainNode = hiddenGainNode;
    // Connect nodes
    this.gainNode.connect(this._hiddenGainNode);
  }

  static create() {
    return new TrackUtilityDSP(new PBGainNode(), new PBGainNode());
  }

  override inputNode(): AudioNode {
    return this.gainNode.inputNode();
  }

  override outputNode(): AudioNode | DSPNode<AudioNode> {
    return this._hiddenGainNode.outputNode();
  }

  override async cloneToOfflineContext(context: OfflineAudioContext): Promise<DSPNode<AudioNode>> {
    const gainNode = await this.gainNode.cloneToOfflineContext(context);
    const hiddenGainNode = await this._hiddenGainNode.cloneToOfflineContext(context);
    return new TrackUtilityDSP(gainNode, hiddenGainNode);
  }
}
