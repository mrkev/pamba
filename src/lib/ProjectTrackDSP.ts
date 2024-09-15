import { SArray, SPrimitive } from "structured-state";
import { liveAudioContext } from "../constants";
import { DSPNode } from "../dsp/DSPNode";
import { FaustEffectID } from "../dsp/FAUST_EFFECTS";
import { FaustAudioEffect } from "../dsp/FaustAudioEffect";
import { nullthrows } from "../utils/nullthrows";
import { PambaWamNode } from "../wam/PambaWamNode";
import { AbstractClip } from "./AbstractClip";
import { appEnvironment } from "./AppEnvironment";
import { connectSerialNodes } from "./connectSerialNodes";
import { PBGainNode } from "./offlineNodes";
import { StandardTrack } from "./ProjectTrack";

export class ProjectTrackDSP<T extends AbstractClip<any>> extends DSPNode<null> {
  // DSP
  public readonly effects: SArray<FaustAudioEffect | PambaWamNode>;
  // The "volume" of the track
  public readonly gainNode: PBGainNode;
  // Hidden gain node, just for solo-ing tracks.
  public readonly _hiddenGainNode: PBGainNode;

  override readonly effectId = "builtin:ProjectTrackNode";
  override name: string | SPrimitive<string>;
  constructor(private readonly track: StandardTrack<T>, effects: (FaustAudioEffect | PambaWamNode)[]) {
    super();
    this.name = track.name;
    this.effects = SArray.create(effects);
    this.gainNode = new PBGainNode();
    this._hiddenGainNode = new PBGainNode();
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

  ////////////////////// GAIN ///////////////////////
  getCurrentGain(): AudioParam {
    return this.gainNode.gain;
  }

  setGain(val: number): void {
    this.gainNode.gain.value = val;
  }

  ////////////////////// SOLO ///////////////////////
  // to be used only when solo-ing
  _hidden_setIsMutedByApplication(muted: boolean) {
    if (muted) {
      this._hiddenGainNode.gain.value = 0;
      return;
    }
    this._hiddenGainNode.gain.value = 1;
  }

  //////////////////// EFFECTS //////////////////////
  async addEffect(effectId: FaustEffectID) {
    const effect = await FaustAudioEffect.create(liveAudioContext(), effectId);
    if (effect == null) {
      return;
    }
    this.effects.push(effect);
  }

  addLoadedWAM(wam: PambaWamNode) {
    this.effects.push(wam);
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
}
