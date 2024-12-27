import { boolean, string } from "structured-state";
import { liveAudioContext } from "../constants";
import { DSPStepI } from "../dsp/DSPNode";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";

export class PBGainNode implements DSPStepI<TrackedAudioNode> {
  readonly effectId: string = "PBGainNode";
  readonly name = string("PBGainNode");
  readonly bypass = boolean(false);

  readonly node: TrackedAudioNode<GainNode>;
  readonly gain: AudioParam;

  private constructor(readonly gainNode: GainNode = new GainNode(liveAudioContext())) {
    this.node = TrackedAudioNode.of(new GainNode(liveAudioContext()));
    this.gain = this.node.get().gain;
  }

  static of(gain: number, context: BaseAudioContext): PBGainNode {
    return new PBGainNode(new GainNode(context, { gain }));
  }

  static defaultLive() {
    return new PBGainNode();
  }

  public inputNode(): TrackedAudioNode {
    return this.node;
  }

  public outputNode(): TrackedAudioNode {
    return this.node;
  }

  public cloneToOfflineContext(context: OfflineAudioContext): Promise<PBGainNode> {
    const node = makeOffline(this.node.get(), context);
    return Promise.resolve(node);
  }
}

export function makeOffline(node: GainNode, context: OfflineAudioContext): PBGainNode {
  return PBGainNode.of(node.gain.value, context);
}
