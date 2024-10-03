import { DSPNode } from "../dsp/DSPNode";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";
import { DSP } from "./DSP";

export function connectSerialNodes(chain: Array<TrackedAudioNode | DSPNode<TrackedAudioNode>>): void {
  if (chain.length < 2) {
    return;
  }
  let currentStep = chain[0];
  for (let i = 1; chain[i] != null; i++) {
    const nextNode = chain[i];

    if (nextNode instanceof DSPNode && nextNode.bypass != null && nextNode.bypass.get() === true) {
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

export function disconnectSerialNodes(chain: Array<TrackedAudioNode | DSPNode<TrackedAudioNode>>): void {
  if (chain.length < 2) {
    return;
  }
  let currentStep = chain[0];
  for (let i = 1; chain[i] != null; i++) {
    const nextNode = chain[i];

    if (nextNode instanceof DSPNode && nextNode.bypass != null && nextNode.bypass.get() === true) {
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
