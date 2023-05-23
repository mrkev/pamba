import { liveAudioContext } from "../constants";
import { DSPNode } from "../dsp/DSPNode";

export class PBGainNode extends DSPNode<AudioNode> {
  readonly node = new GainNode(liveAudioContext);
  readonly gain = this.node.gain;

  override inputNode(): AudioNode {
    return this.node;
  }

  override outputNode(): AudioNode {
    return this.node;
  }

  offline(context: OfflineAudioContext): GainNode {
    console.log("MAKING OFFLINE GAIN");
    const node = makeOffline(this.node, context);
    return node;
  }
}

export function makeOffline(node: GainNode, context: OfflineAudioContext): GainNode {
  const offline = new GainNode(context, { gain: node.gain.value });
  return offline;
}
