import { IFaustMonoWebAudioNode } from "@grame/faustwasm";
import type { AudioContextInfo } from "../lib/initAudioContext";
import type { SBoolean, SPrimitive } from "structured-state";

export abstract class DSPNode<I extends AudioNode | null = AudioNode> {
  readonly _destinations: Set<AudioNode | DSPNode> = new Set();
  readonly bypass: null | SBoolean = null;

  abstract readonly effectId: string;
  abstract name: string | SPrimitive<string>;

  abstract inputNode(): I;
  abstract outputNode(): AudioNode | DSPNode;

  abstract cloneToOfflineContext(
    context: OfflineAudioContext,
    offlineContextInfo: AudioContextInfo,
  ): Promise<DSPNode | null>;

  public connect(audioNode: AudioNode | IFaustMonoWebAudioNode | DSPNode<AudioNode>): void {
    if (this._destinations.has(audioNode)) {
      console.warn("Destination already connected");
      return;
    }
    this._destinations.add(audioNode);
    if (audioNode instanceof AudioNode) {
      this.outputNode().connect(audioNode);
    } else {
      this.outputNode().connect(audioNode.inputNode());
    }
  }

  public disconnect(audioNode: AudioNode | DSPNode<AudioNode>) {
    if (!this._destinations.has(audioNode)) {
      console.warn("Can't disconnect destination that's not present");
      return;
    }

    if (audioNode instanceof AudioNode) {
      this.outputNode().disconnect(audioNode);
    } else {
      this.outputNode().disconnect(audioNode.inputNode());
    }
    this._destinations.delete(audioNode);
  }

  public disconnectAll() {
    for (const dest of this._destinations) {
      this.disconnect(dest);
    }
  }
}
