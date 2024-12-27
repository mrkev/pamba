import { DSPStep, DSPStepI } from "../dsp/DSPNode";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";
import { exhaustive } from "./state/Subbable";

export const DSP = {
  inputOf(step: DSPStep | TrackedAudioNode): TrackedAudioNode {
    switch (true) {
      case step instanceof DSPStep:
        return step.inputNode();
      case step instanceof TrackedAudioNode:
        return step;
      default:
        exhaustive(step);
    }
  },

  outputOf(step: DSPStep | TrackedAudioNode): TrackedAudioNode {
    switch (true) {
      case step instanceof DSPStep:
        return step.outputNode();
      case step instanceof TrackedAudioNode:
        return step;
      default:
        exhaustive(step);
    }
  },

  connect(step: DSPStepI<any>, dest: TrackedAudioNode | DSPStep<TrackedAudioNode>): void {
    step.outputNode().connect(DSP.inputOf(dest));
  },

  disconnect(step: DSPStepI<any>, dest: TrackedAudioNode | DSPStep<TrackedAudioNode>) {
    step.outputNode().disconnect(DSP.inputOf(dest));
  },

  disconnectAll(step: DSPStepI<any>) {
    step.outputNode().disconnectAll();
  },
};
