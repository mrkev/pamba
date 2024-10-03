import { boolean, string } from "structured-state";
import { liveAudioContext } from "../constants";
import { DSPStep } from "../dsp/DSPNode";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";

export class PBGainNode extends DSPStep<TrackedAudioNode> {
  override name = string("PBGainNode");
  override effectId: string = "PBGainNode";
  override bypass = boolean(false);

  readonly node: TrackedAudioNode<GainNode>;
  readonly gain: AudioParam;

  constructor(gainNode: GainNode = new GainNode(liveAudioContext())) {
    super();
    this.node = TrackedAudioNode.of(gainNode);
    this.gain = this.node.get().gain;
  }

  override inputNode(): TrackedAudioNode {
    return this.node;
  }

  override outputNode(): TrackedAudioNode {
    return this.node;
  }

  override cloneToOfflineContext(context: OfflineAudioContext): Promise<PBGainNode> {
    console.log("MAKING OFFLINE GAIN");
    const node = makeOffline(this.node.get(), context);
    return Promise.resolve(node);
  }
}

export function makeOffline(node: GainNode, context: OfflineAudioContext): PBGainNode {
  const offline = new GainNode(context, { gain: node.gain.value });
  return new PBGainNode(offline);
}
