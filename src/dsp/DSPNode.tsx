export abstract class DSPNode {
  private readonly destinations: Set<AudioNode> = new Set();

  abstract inputNode(): AudioNode;
  abstract outputNode(): AudioNode;
  abstract prepareForPlayback(): void;
  abstract stopPlayback(): void;

  public connect(audioNode: AudioNode): void {
    if (this.destinations.has(audioNode)) {
      console.warn("Destination already connected");
      return;
    }
    this.destinations.add(audioNode);
    this.outputNode().connect(audioNode);
  }

  public disconnect(audioNode: AudioNode) {
    if (!this.destinations.has(audioNode)) {
      console.warn("Can't disconnect destination that's not present");
      return;
    }
    this.destinations.delete(audioNode);
    this.outputNode().disconnect(audioNode);
  }

  public disconnectAll() {
    for (const dest of this.destinations) {
      this.disconnect(dest);
    }
  }
}
