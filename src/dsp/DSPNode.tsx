import type { AudioContextInfo } from "../lib/initAudioContext";
import type { SPrimitive } from "../lib/state/LinkedState";

export abstract class DSPNode<I extends AudioNode | null = AudioNode> {
  private readonly destinations: Set<AudioNode | DSPNode> = new Set();

  abstract inputNode(): I;
  abstract outputNode(): AudioNode | DSPNode;

  abstract cloneToOfflineContext(
    context: OfflineAudioContext,
    offlineContextInfo: AudioContextInfo
  ): Promise<DSPNode | null>;
  abstract effectId: string;
  abstract name: string | SPrimitive<string>;

  public connect(audioNode: AudioNode | DSPNode<AudioNode>): void {
    if (this.destinations.has(audioNode)) {
      console.warn("Destination already connected");
      return;
    }
    this.destinations.add(audioNode);
    if (audioNode instanceof AudioNode) {
      this.outputNode().connect(audioNode);
    } else {
      this.outputNode().connect(audioNode.inputNode());
    }
  }

  public disconnect(audioNode: AudioNode | DSPNode<AudioNode>) {
    if (!this.destinations.has(audioNode)) {
      console.warn("Can't disconnect destination that's not present");
      return;
    }

    if (audioNode instanceof AudioNode) {
      this.outputNode().disconnect(audioNode);
    } else {
      this.outputNode().disconnect(audioNode.inputNode());
    }
    this.destinations.delete(audioNode);
  }

  public disconnectAll() {
    for (const dest of this.destinations) {
      this.disconnect(dest);
    }
  }
}
