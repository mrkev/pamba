import { string } from "structured-state";
import { liveAudioContext } from "../constants";
import { DSPNode } from "../dsp/DSPNode";

export class PBGainNode extends DSPNode<AudioNode> {
  override name = string("PBGainNode");
  override effectId: string = "PBGainNode";

  readonly node: GainNode;
  readonly gain: AudioParam;

  constructor(gainNode: GainNode = new GainNode(liveAudioContext())) {
    super();
    this.node = gainNode;
    this.gain = this.node.gain;
  }

  override inputNode(): AudioNode {
    return this.node;
  }

  override outputNode(): AudioNode {
    return this.node;
  }

  override cloneToOfflineContext(context: OfflineAudioContext): Promise<PBGainNode> {
    console.log("MAKING OFFLINE GAIN");
    const node = makeOffline(this.node, context);
    return Promise.resolve(node);
  }
}

export function makeOffline(node: GainNode, context: OfflineAudioContext): PBGainNode {
  const offline = new GainNode(context, { gain: node.gain.value });
  return new PBGainNode(offline);
}
