import { SArray, SBoolean, SString } from "structured-state";
import { WebAudioPeakMeter } from "web-audio-peak-meter";
import { liveAudioContext } from "../constants";
import { DSP } from "../dsp/DSP";
import { DSPStep } from "../dsp/DSPStep";
import { FaustEffectID } from "../dsp/FAUST_EFFECTS";
import { FaustAudioEffect } from "../dsp/FaustAudioEffect";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";
import { PambaWamNode } from "../wam/PambaWamNode";
import { PBGainNode } from "./offlineNodes";

export class ProjectTrackDSP implements DSPStep<null> {
  readonly effectId = "builtin:ProjectTrackNode";

  // Hidden gain node, just for solo-ing tracks.
  public readonly _hiddenGainNode: PBGainNode;

  readonly meterInstance: WebAudioPeakMeter;

  constructor(
    readonly name: SString,
    readonly gainNode: PBGainNode, // The "volume" of the track
    readonly effects: SArray<FaustAudioEffect | PambaWamNode>,
    readonly bypass: SBoolean, // effectively used as mute
  ) {
    this._hiddenGainNode = PBGainNode.defaultLive();
    // TODO: garbage collect?
    this.meterInstance = new WebAudioPeakMeter(this._hiddenGainNode.outputNode().get(), undefined as any);

    // connections //
    DSP.connect(this.gainNode, this._hiddenGainNode.node);
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
    if (this.bypass.get()) {
      return;
    }

    DSP.connectSerialNodes([
      ///
      source,
      ...this.effects._getRaw(),
      this.gainNode,
    ]);
  }

  disconnectDSPAfterPlayback(source: TrackedAudioNode): void {
    if (this.bypass.get()) {
      return;
    }

    DSP.disconnectSerialNodes([
      ///
      source,
      ...this.effects._getRaw(),
      this.gainNode.node,
    ]);
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
