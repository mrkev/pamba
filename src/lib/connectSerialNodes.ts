import { DSPNode } from "../dsp/DSPNode";

export function connectSerialNodes(chain: (AudioNode | DSPNode<AudioNode>)[]): void {
  if (chain.length < 2) {
    return;
  }
  let currentNode = chain[0];
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

    if (currentNode instanceof AudioNode && nextNode instanceof AudioNode) {
      currentNode.connect(nextNode);
      currentNode = nextNode;
      continue;
    }
    if (currentNode instanceof AudioNode && nextNode instanceof DSPNode) {
      currentNode.connect(nextNode.inputNode());
      currentNode = nextNode;
      continue;
    }
    if (currentNode instanceof DSPNode) {
      currentNode.connect(nextNode);
      currentNode = nextNode;
      continue;
    }
  }
}
