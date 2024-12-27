import { DSPStep } from "./DSPStep";
import { TrackedAudioNode } from "./TrackedAudioNode";
import { connectSerialNodes, disconnectSerialNodes } from "./connectSerialNodes";

export const DSP = {
  inputOf(step: TrackedAudioNode | DSPStep): TrackedAudioNode {
    switch (true) {
      case step instanceof TrackedAudioNode:
        return step;
      default:
        return step.inputNode();
    }
  },

  outputOf(step: TrackedAudioNode | DSPStep): TrackedAudioNode {
    switch (true) {
      case step instanceof TrackedAudioNode:
        return step;
      default:
        return step.outputNode();
    }
  },

  connect(step: DSPStep<any>, dest: TrackedAudioNode): void {
    step.outputNode().connect(DSP.inputOf(dest));
  },

  disconnect(step: DSPStep<any>, dest: TrackedAudioNode) {
    step.outputNode().disconnect(DSP.inputOf(dest));
  },

  disconnectAll(step: DSPStep<any>) {
    step.outputNode().disconnectAll();
  },

  connectSerialNodes,
  disconnectSerialNodes,
};
