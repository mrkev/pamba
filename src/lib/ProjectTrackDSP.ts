import { SArray, SBoolean, SString } from "structured-state";
import { WebAudioPeakMeter } from "web-audio-peak-meter";
import { liveAudioContext } from "../constants";
import { DSP } from "../dsp/DSP";
import { DSPStep } from "../dsp/DSPStep";
import { FaustEffectID, TRACK_UTILITY_ID } from "../dsp/FAUST_EFFECTS";
import { FaustAudioEffect } from "../dsp/FaustAudioEffect";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";
import { nullthrows } from "../utils/nullthrows";
import { PambaWamNode } from "../wam/PambaWamNode";
import { PBGainNode } from "./PBGainNode";

export const GAIN_ADDRESS = "/track/Gain";
export const MUTE_ADDRESS = "/track/Mute";
export const PAN_ADDRESS = "/track/Pan";

export async function defaultTrackUtility() {
  return nullthrows(
    await FaustAudioEffect.create(liveAudioContext(), TRACK_UTILITY_ID),
    "Couldn't create track utility",
  );
}

/** Manages the whole DSP chain of a standard project track */
export class ProjectTrackDSP implements DSPStep<null> {
  readonly effectId = "builtin:ProjectTrackNode";

  // Hidden gain node, just for solo-ing tracks.
  public readonly _hiddenGainNode: PBGainNode;

  readonly meterInstance: WebAudioPeakMeter;

  // The source node the live DSP chain is currently wired from, or null when the
  // chain isn't connected (eg. an audio track that isn't playing). Used to rewire
  // the graph in place when the effect chain changes during playback.
  private connectedSource: TrackedAudioNode | null = null;

  constructor(
    readonly name: SString,
    readonly effectNodes: SArray<FaustAudioEffect | PambaWamNode>,
    readonly bypass: SBoolean, // effectively used as mute
    /**
     * Has gain, mute, pan
     */
    readonly utility: FaustAudioEffect,
  ) {
    this._hiddenGainNode = PBGainNode.defaultLive();
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
    this.connectedSource = source;
    if (this.bypass.get()) {
      return;
    }

    DSP.connectSerialNodes([
      ///
      source,
      ...this.effectNodes._getRaw(),
      this.utility,
      this._hiddenGainNode,
    ]);
  }

  disconnectDSPAfterPlayback(source: TrackedAudioNode): void {
    this.connectedSource = null;
    if (this.bypass.get()) {
      return;
    }

    DSP.disconnectSerialNodes([
      ///
      source,
      ...this.effectNodes._getRaw(),
      this.utility,
      this._hiddenGainNode,
    ]);
  }

  /**
   * Rewires the live DSP graph to reflect a change to the effect chain (eg. an
   * effect being bypassed). `mutate` applies the change between tearing down the
   * old topology and building the new one, so disconnect/connectSerialNodes each
   * see a consistent bypass state. A brief click is expected — there's no
   * crossfade. No-ops (just applies the mutation) when the chain isn't live, in
   * which case it gets rebuilt correctly the next time it's connected.
   */
  reconnectEffectChain(mutate: () => void): void {
    const source = this.connectedSource;
    if (source == null || this.bypass.get()) {
      mutate();
      return;
    }
    this.disconnectDSPAfterPlayback(source); // tear down old topology
    mutate(); // apply the change (eg. flip an effect's bypass)
    this.connectToDSPForPlayback(source); // build new topology
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
    // Rewire so the effect is wired into the graph immediately when added during
    // playback; otherwise it dangles unconnected (inaudible) until the next play.
    this.reconnectEffectChain(() => {
      if (index === "last") {
        this.effectNodes.push(effect);
      } else if (index === "first") {
        this.effectNodes.unshift(effect);
      } else {
        this.effectNodes.splice(index, 0, effect);
      }
    });
  }

  /** Removes an effect from the chain, rewiring live playback. Does not destroy it. */
  removeEffect(effect: PambaWamNode | FaustAudioEffect) {
    this.reconnectEffectChain(() => {
      this.effectNodes.remove(effect);
    });
  }
}
