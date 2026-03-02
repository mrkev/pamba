import { boolean, string } from "structured-state";
import { liveAudioContext } from "../constants";
import { DSPStep } from "../dsp/DSPStep";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";

export class PBGainNode implements DSPStep<TrackedAudioNode> {
  readonly effectId: string = "PBGainNode";
  readonly name = string("PBGainNode");
  readonly bypass = boolean(false);

  readonly gain: AudioParam;

  private constructor(readonly node: TrackedAudioNode<GainNode>) {
    this.gain = this.node.get().gain;
  }

  static of(gain: number, context: BaseAudioContext): PBGainNode {
    const node = TrackedAudioNode.create(GainNode, context, { gain });
    return new PBGainNode(node);
  }

  static defaultLive() {
    const node = TrackedAudioNode.create(GainNode, liveAudioContext());
    return new PBGainNode(node);
  }

  public inputNode(): TrackedAudioNode {
    return this.node;
  }

  public outputNode(): TrackedAudioNode {
    return this.node;
  }

  public cloneToOfflineContext(context: OfflineAudioContext): Promise<PBGainNode> {
    const node = PBGainNode.of(this.node.get().gain.value, context);
    return Promise.resolve(node);
  }
}
