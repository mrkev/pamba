import { SArray, SPrimitive, SSchemaArray } from "structured-state";
import { liveAudioContext } from "../constants";
import { DSPNode } from "../dsp/DSPNode";
import { EffectID } from "../dsp/FAUST_EFFECTS";
import { FaustAudioEffect } from "../dsp/FaustAudioEffect";
import { nullthrows } from "../utils/nullthrows";
import { PambaWamNode } from "../wam/PambaWamNode";
import { AbstractClip, Seconds, addClip, deleteTime, pushClip, removeClip, splitClip } from "./AbstractClip";
import { appEnvironment } from "./AppEnvironment";
import { AudioClip } from "./AudioClip";
import { connectSerialNodes } from "./connectSerialNodes";
import { AudioContextInfo } from "./initAudioContext";
import { PBGainNode } from "./offlineNodes";
import type { AudioProject } from "./project/AudioProject";

export class ProjectTrackDSP<T extends AbstractClip<any>> extends DSPNode<null> {
  override readonly effectId = "builtin:ProjectTrackNode";
  override name: string | SPrimitive<string>;
  constructor(private readonly track: StandardTrack<T>) {
    super();
    this.name = track.name;
  }

  override inputNode(): null {
    return null;
  }

  override outputNode() {
    return this.track._hiddenGainNode;
  }

  override cloneToOfflineContext(_context: OfflineAudioContext): Promise<DSPNode<AudioNode> | null> {
    throw new Error("AudioTrack: DSPNode: can't cloneToOfflineContext.");
  }
}

// TODO: move these things out of the abstract class
export interface StandardTrack<T extends AbstractClip<any>> {
  readonly node: ProjectTrackDSP<T>;
  // The "volume" of the track
  readonly gainNode: PBGainNode;
  // Hidden gain node, just for solo-ing tracks.
  readonly _hiddenGainNode: PBGainNode;
  readonly name: SPrimitive<string>;
  readonly height: SPrimitive<number>;

  prepareForPlayback(context: AudioContext): void;
  prepareForBounce(context: OfflineAudioContext, offlineContextInfo: AudioContextInfo): Promise<AudioNode>;

  // NOTE: needs to be called right after .prepareForPlayback
  startPlayback(tempo: number, context: BaseAudioContext, offset?: number): void;
  stopPlayback(context: BaseAudioContext): void;
}

export class Track {
  // todo: move to track node?
  static getCurrentGain(track: StandardTrack<any>): AudioParam {
    return track.gainNode.gain;
  }

  // todo: move to track node?
  static setGain(track: StandardTrack<any>, val: number): void {
    track.gainNode.gain.value = val;
  }

  // todo: move to track node?
  // to be used only when solo-ing
  static _hidden_setIsMutedByApplication(track: StandardTrack<any>, muted: boolean) {
    if (muted) {
      track._hiddenGainNode.gain.value = 0;
      return;
    }
    track._hiddenGainNode.gain.value = 1;
  }
}

export abstract class ProjectTrack<T extends AbstractClip<any>> {
  public readonly height: SPrimitive<number>;
  // The "volume" of the track
  public readonly gainNode: PBGainNode;
  // Hidden gain node, just for solo-ing tracks.
  public readonly _hiddenGainNode: PBGainNode;

  // A track is a collection of non-overalping clips.
  // Invariants:
  // - Sorted by start time.
  // - Non-overlapping clips.
  public abstract readonly clips: SSchemaArray<any>; // TODO: <T>, not there cause midi clip isn't ready

  // DSP
  public readonly effects: SArray<FaustAudioEffect | PambaWamNode>;

  constructor(name: string, effects: (FaustAudioEffect | PambaWamNode)[], height: number) {
    this.effects = SArray.create(effects);
    this.height = SPrimitive.of<number>(height);
    this.gainNode = new PBGainNode();
    this._hiddenGainNode = new PBGainNode();
  }

  connectToDSPForPlayback(source: AudioNode): void {
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

  disconnectDSPAfterPlayback(source: AudioNode): void {
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

  //////////// CLIPS ////////////

  addClip(project: AudioProject, newClip: T): void {
    if (!project.canEditTrack(project, this)) {
      return;
    }
    addClip(newClip, this.clips);
  }

  // Adds a clip right after the last clip
  pushClip(project: AudioProject, newClip: T): void {
    if (!project.canEditTrack(project, this)) {
      return;
    }
    pushClip(newClip, this.clips);
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
  }

  deleteTime(project: AudioProject, start: number, end: number): void {
    if (!project.canEditTrack(project, this)) {
      return;
    }

    console.log("AT deleteTime");
    const notifyClips = deleteTime<AudioClip, Seconds>(start, end, this.clips);
    notifyClips.forEach((clip) => {
      console.log("clip", clip);
      clip._notifyChange();
    });
  }

  splitClip(project: AudioProject, clip: T, offset: number): void {
    if (!project.canEditTrack(project, this)) {
      return;
    }

    splitClip(clip, offset, this.clips);
  }

  //////////////////// EFFECTS //////////////////////

  async addEffect(effectId: EffectID) {
    const effect = await FaustAudioEffect.create(liveAudioContext(), effectId);
    if (effect == null) {
      return;
    }
    this.effects.push(effect);
  }

  async addWAM(url: string) {
    const [hostGroupId] = nullthrows(appEnvironment.wamHostGroup.get());
    const module = await PambaWamNode.fromURL(url, hostGroupId, liveAudioContext());
    if (module == null) {
      console.error("Error: NO MODULE");
      return;
    }
    this.effects.push(module);
  }

  /////////////// DEBUGGING /////////////////

  toString() {
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
