import { DSPNode } from "../dsp/DSPNode";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";
import { exhaustive } from "./state/Subbable";

export class DSP {
  static inputOf(step: DSPNode<TrackedAudioNode> | TrackedAudioNode): TrackedAudioNode {
    switch (true) {
      case step instanceof DSPNode:
        return step.inputNode();
      case step instanceof TrackedAudioNode:
        return step;
      default:
        exhaustive(step);
    }
  }

  static outputOf(step: DSPNode<TrackedAudioNode> | TrackedAudioNode): TrackedAudioNode {
    switch (true) {
      case step instanceof DSPNode:
        return step.outputNode();
      case step instanceof TrackedAudioNode:
        return step;
      default:
        exhaustive(step);
    }
  }
}
