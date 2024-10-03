import { DSPStep } from "../dsp/DSPNode";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";
import { exhaustive } from "./state/Subbable";

export class DSP {
  static inputOf(step: DSPStep | TrackedAudioNode): TrackedAudioNode {
    switch (true) {
      case step instanceof DSPStep:
        return step.inputNode();
      case step instanceof TrackedAudioNode:
        return step;
      default:
        exhaustive(step);
    }
  }

  static outputOf(step: DSPStep | TrackedAudioNode): TrackedAudioNode {
    switch (true) {
      case step instanceof DSPStep:
        return step.outputNode();
      case step instanceof TrackedAudioNode:
        return step;
      default:
        exhaustive(step);
    }
  }

  static connect(step: DSPStep<any>, dest: TrackedAudioNode | DSPStep<TrackedAudioNode>): void {
    step.outputNode().connect(DSP.inputOf(dest));
  }

  static disconnect(step: DSPStep<any>, dest: TrackedAudioNode | DSPStep<TrackedAudioNode>) {
    step.outputNode().disconnect(DSP.inputOf(dest));
  }

  static disconnectAll(step: DSPStep<any>) {
    step.outputNode().disconnectAll();
  }
}
