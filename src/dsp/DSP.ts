import { SBoolean } from "structured-state";
import { DSPStep } from "./DSPStep";
import { TrackedAudioNode } from "./TrackedAudioNode";

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

function connectSerialNodes(chain: Array<TrackedAudioNode | DSPStep<TrackedAudioNode>>): void {
  if (chain.length < 2) {
    return;
  }
  let currentStep = chain[0];
  for (let i = 1; chain[i] != null; i++) {
    const nextNode = chain[i];

    if ("bypass" in nextNode && nextNode.bypass instanceof SBoolean && nextNode.bypass.get() === true) {
      continue;
    }

    // console.groupCollapsed(`Connected: ${currentNode.constructor.name} -> ${nextNode.constructor.name}`);
    // console.log(currentNode);
    // console.log("-->");
    // console.log(nextNode);
    // console.groupEnd();
    DSP.outputOf(currentStep).connect(DSP.inputOf(nextNode));
    currentStep = nextNode;
  }
}

function disconnectSerialNodes(chain: Array<TrackedAudioNode | DSPStep<TrackedAudioNode>>): void {
  if (chain.length < 2) {
    return;
  }
  let currentStep = chain[0];
  for (let i = 1; chain[i] != null; i++) {
    const nextNode = chain[i];

    if ("bypass" in nextNode && nextNode.bypass instanceof SBoolean && nextNode.bypass.get() === true) {
      continue;
    }

    // console.groupCollapsed(`Connected: ${currentNode.constructor.name} -> ${nextNode.constructor.name}`);
    // console.log(currentNode);
    // console.log("-->");
    // console.log(nextNode);
    // console.groupEnd();
    DSP.outputOf(currentStep).disconnect(DSP.inputOf(nextNode));
    currentStep = nextNode;
  }
}
