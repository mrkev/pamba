import { DSPStep, DSPStepI } from "../dsp/DSPNode";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";
import { connectSerialNodes, disconnectSerialNodes } from "./connectSerialNodes";

export const DSP = {
  inputOf(step: DSPStep | TrackedAudioNode | DSPStepI): TrackedAudioNode {
    switch (true) {
      case step instanceof DSPStep:
        return step.inputNode();
      case step instanceof TrackedAudioNode:
        return step;
      default:
        return step.inputNode();
    }
  },

  outputOf(step: DSPStep | TrackedAudioNode | DSPStepI): TrackedAudioNode {
    switch (true) {
      case step instanceof DSPStep:
        return step.outputNode();
      case step instanceof TrackedAudioNode:
        return step;
      default:
        return step.outputNode();
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

  connectSerialNodes,
  disconnectSerialNodes,
};
