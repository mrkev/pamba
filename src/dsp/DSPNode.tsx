import { type SBoolean, type SPrimitive } from "structured-state";
import { DSP } from "../lib/DSP";
import type { AudioContextInfo } from "../lib/initAudioContext";
import type { TrackedAudioNode } from "./TrackedAudioNode";

/** todo, eventaully make an interface probably */
export abstract class DSPNode<I extends TrackedAudioNode | null = TrackedAudioNode> {
  readonly bypass: null | SBoolean = null;

  abstract readonly effectId: string;
  abstract name: SPrimitive<string>;

  abstract inputNode(): I;
  abstract outputNode(): TrackedAudioNode;

  abstract cloneToOfflineContext(
    context: OfflineAudioContext,
    offlineContextInfo: AudioContextInfo,
  ): Promise<DSPNode | null>;

  public connect(dest: TrackedAudioNode | DSPNode<TrackedAudioNode>): void {
    this.outputNode().connect(DSP.inputOf(dest));
  }

  public disconnect(dest: TrackedAudioNode | DSPNode<TrackedAudioNode>) {
    this.outputNode().disconnect(DSP.inputOf(dest));
  }

  public disconnectAll() {
    this.outputNode().disconnectAll();
  }
}
