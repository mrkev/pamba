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
    /**
     * The track's ordered effect chain. Mutate ONLY through addEffect / removeEffect /
     * moveEffect / setEffectBypassed — they keep the live audio graph in sync. Pushing
     * or splicing this array directly during playback leaves effects dangling and
     * unconnected (see reconnectEffectChain).
     */
    readonly effectNodes: SArray<FaustAudioEffect | PambaWamNode>,
    // Track-level bypass, effectively used as mute. NOTE: like the effect chain, this
    // would need a reconnect to take effect if toggled mid-playback — today it's only
    // changed while stopped.
    readonly bypass: SBoolean,
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

  /** The full serial chain for this track, in signal order. */
  private fullChain(source: TrackedAudioNode): Array<TrackedAudioNode | DSPStep<TrackedAudioNode>> {
    return [source, ...this.effectNodes._getRaw(), this.utility, this._hiddenGainNode];
  }

  connectChain(source: TrackedAudioNode): void {
    this.connectedSource = source;
    if (this.bypass.get()) {
      return;
    }
    DSP.connectSerialNodes(this.fullChain(source));
  }

  disconnectChain(source: TrackedAudioNode): void {
    this.connectedSource = null;
    if (this.bypass.get()) {
      return;
    }
    DSP.disconnectSerialNodes(this.fullChain(source));
  }

  /**
   * Rewires the live DSP graph to reflect a change to the effect chain (adding,
   * removing or moving effects). `mutate` applies the change between tearing down
   * the old topology and building the new one, so disconnect/connectSerialNodes
   * each see a consistent state. A brief click is expected — there's no crossfade,
   * and the whole chain is rebuilt; for single-effect bypass toggles prefer
   * setEffectBypassed, which only disturbs the neighborhood. No-ops (just applies
   * the mutation) when the chain isn't live, in which case it gets rebuilt
   * correctly the next time it's connected.
   */
  reconnectEffectChain(mutate: () => void): void {
    const source = this.connectedSource;
    if (source == null || this.bypass.get()) {
      mutate();
      return;
    }
    this.disconnectChain(source); // tear down old topology
    mutate(); // apply the change (eg. add/remove/move an effect)
    this.connectChain(source); // build new topology
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

  private insertEffect(effect: PambaWamNode | FaustAudioEffect, index: number | "first" | "last") {
    if (index === "last") {
      this.effectNodes.push(effect);
    } else if (index === "first") {
      this.effectNodes.unshift(effect);
    } else {
      this.effectNodes.splice(index, 0, effect);
    }
  }

  addEffect(effect: PambaWamNode | FaustAudioEffect, index: number | "first" | "last") {
    // Rewire so the effect is wired into the graph immediately when added during
    // playback; otherwise it dangles unconnected (inaudible) until the next play.
    this.reconnectEffectChain(() => this.insertEffect(effect, index));
  }

  /** Removes an effect from the chain, rewiring live playback. Does not destroy it. */
  removeEffect(effect: PambaWamNode | FaustAudioEffect) {
    this.reconnectEffectChain(() => this.effectNodes.remove(effect));
  }

  /** Moves an effect to a new position in this track's chain, rewiring live playback. */
  moveEffect(effect: PambaWamNode | FaustAudioEffect, index: number | "first" | "last") {
    this.reconnectEffectChain(() => {
      this.effectNodes.remove(effect);
      this.insertEffect(effect, index);
    });
  }

  /**
   * Sets a single effect's bypass, rewiring only the edges immediately around that
   * effect so the rest of the chain — and other effects' tails — aren't disturbed
   * (a full chain rebuild would click every node). No-ops the wiring when the chain
   * isn't live; the flag still flips so the next connect is correct.
   */
  setEffectBypassed(effect: FaustAudioEffect | PambaWamNode, bypassed: boolean): void {
    if (effect.bypass.get() === bypassed) {
      return;
    }

    const source = this.connectedSource;
    if (source == null || this.bypass.get()) {
      effect.bypass.set(bypassed);
      return;
    }

    const chain = this.fullChain(source);
    const idx = chain.indexOf(effect);
    if (idx < 0) {
      // Not in this chain (shouldn't happen) — fall back to a full rebuild.
      this.reconnectEffectChain(() => effect.bypass.set(bypassed));
      return;
    }

    // Nearest non-bypassed neighbors in the signal path. The source (before) and
    // hidden gain (after) never carry a bypass flag, so both are always found.
    const prev = this.activeNeighbor(chain, idx, -1);
    const next = this.activeNeighbor(chain, idx, 1);

    if (bypassed) {
      // prev -> effect -> next   becomes   prev -> next
      DSP.outputOf(prev).disconnect(DSP.inputOf(effect));
      DSP.outputOf(effect).disconnect(DSP.inputOf(next));
      effect.bypass.set(true);
      DSP.outputOf(prev).connect(DSP.inputOf(next));
    } else {
      // prev -> next   becomes   prev -> effect -> next
      DSP.outputOf(prev).disconnect(DSP.inputOf(next));
      effect.bypass.set(false);
      DSP.outputOf(prev).connect(DSP.inputOf(effect));
      DSP.outputOf(effect).connect(DSP.inputOf(next));
    }
  }

  private activeNeighbor(
    chain: Array<TrackedAudioNode | DSPStep<TrackedAudioNode>>,
    from: number,
    dir: -1 | 1,
  ): TrackedAudioNode | DSPStep<TrackedAudioNode> {
    for (let i = from + dir; i >= 0 && i < chain.length; i += dir) {
      if (!DSP.isBypassed(chain[i])) {
        return chain[i];
      }
    }
    throw new Error("ProjectTrackDSP: no active neighbor in chain");
  }
}
