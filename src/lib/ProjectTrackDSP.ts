import { SArray, SBoolean, SString } from "structured-state";
import { WebAudioPeakMeter } from "web-audio-peak-meter";
import { liveAudioContext } from "../constants";
import { DSPStep, DSPStepI } from "../dsp/DSPNode";
import { FaustEffectID } from "../dsp/FAUST_EFFECTS";
import { FaustAudioEffect } from "../dsp/FaustAudioEffect";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";
import { PambaWamNode } from "../wam/PambaWamNode";
import { connectSerialNodes, disconnectSerialNodes } from "./connectSerialNodes";
import { PBGainNode } from "./offlineNodes";

export class ProjectTrackDSP implements DSPStepI<null> {
  readonly effectId = "builtin:ProjectTrackNode";

  // DSP
  public readonly effects: SArray<FaustAudioEffect | PambaWamNode>;
  // The "volume" of the track
  public readonly gainNode: PBGainNode;
  // Hidden gain node, just for solo-ing tracks.
  public readonly _hiddenGainNode: PBGainNode;

  readonly meterInstance: WebAudioPeakMeter;

  constructor(
    readonly name: SString,
    readonly bypass: SBoolean,
    effects: (FaustAudioEffect | PambaWamNode)[],
  ) {
    this.effects = SArray.create(effects);
    this.gainNode = new PBGainNode();
    this._hiddenGainNode = new PBGainNode();
    // TODO: garbage collect?
    this.meterInstance = new WebAudioPeakMeter(this._hiddenGainNode.outputNode().get(), undefined as any);
  }

  inputNode(): null {
    return null;
  }

  outputNode() {
    return this._hiddenGainNode.outputNode();
  }

  cloneToOfflineContext(_context: OfflineAudioContext): Promise<DSPStep<TrackedAudioNode> | null> {
    throw new Error("AudioTrack: DSPNode: can't cloneToOfflineContext.");
  }

  connectToDSPForPlayback(source: TrackedAudioNode): void {
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

  disconnectDSPAfterPlayback(source: TrackedAudioNode): void {
    const chain = [
      // foo
      source,
      ...this.effects._getRaw(),
      this.gainNode.node,
      this._hiddenGainNode.node,
    ];

    disconnectSerialNodes(chain);

    // for (let i = 0; i < chain.length - 1; i++) {
    //   const currentNode = chain[i];
    //   const nextNode = chain[i + 1];

    //   currentNode.disconnect(nextNode);
    // }
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
  async addFaustEffect(effectId: FaustEffectID, index: number | "first" | "last") {
    const effect = await FaustAudioEffect.create(liveAudioContext(), effectId);
    if (effect == null) {
      return;
    }

    this.addEffect(effect, index);
  }

  addEffect(effect: PambaWamNode | FaustAudioEffect, index: number | "first" | "last") {
    if (index === "last") {
      this.effects.push(effect);
    } else if (index === "first") {
      this.effects.unshift(effect);
    } else {
      this.effects.splice(index, 0, effect);
    }
  }
}
