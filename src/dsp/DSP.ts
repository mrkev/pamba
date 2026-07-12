import { SBoolean } from "structured-state";
import { DSPStep } from "./DSPStep";
import { TrackedAudioNode } from "./TrackedAudioNode";

type SerialNode = TrackedAudioNode | DSPStep<TrackedAudioNode>;

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

  /**
   * A node is bypassed when it exposes a `bypass` flag that's currently on. Raw
   * TrackedAudioNodes (eg. sources, gain nodes) have no such flag and are never
   * skipped.
   */
  isBypassed(node: SerialNode): boolean {
    return "bypass" in node && node.bypass instanceof SBoolean && node.bypass.get();
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

/**
 * Walks each wired edge of a serial chain, skipping bypassed nodes, and applies
 * `fn` to the (output, input) pair that connects one active node to the next.
 */
function forEachSerialEdge(chain: Array<SerialNode>, fn: (from: TrackedAudioNode, to: TrackedAudioNode) => void): void {
  if (chain.length < 2) {
    return;
  }
  let current = chain[0];
  for (let i = 1; i < chain.length; i++) {
    const next = chain[i];
    if (DSP.isBypassed(next)) {
      continue;
    }
    fn(DSP.outputOf(current), DSP.inputOf(next));
    current = next;
  }
}

function connectSerialNodes(chain: Array<SerialNode>): void {
  forEachSerialEdge(chain, (from, to) => from.connect(to));
}

function disconnectSerialNodes(chain: Array<SerialNode>): void {
  forEachSerialEdge(chain, (from, to) => from.disconnect(to));
}
