import { boolean } from "structured-state";

/**
 * A wrapper for WebAudio's AudioNode, that keeps track of destinations.
 * Otherwise, calling audioNode.disconnect(dest) throws if dest is not a destination
 * of audioNode
 *
 * Also includes other goodies like bypass (todo)
 */
export class TrackedAudioNode<T extends AudioNode = AudioNode> {
  readonly _destinations = new Set<TrackedAudioNode>();
  readonly bypass = boolean(false);
  constructor(private readonly node: T) {}

  public get() {
    return this.node;
  }

  static of<T extends AudioNode>(node: T) {
    return new TrackedAudioNode(node);
  }

  public connect(dest: TrackedAudioNode): void {
    if (this._destinations.has(dest)) {
      console.warn("Destination already connected");
      return;
    }
    this._destinations.add(dest);
    this.node.connect(dest.node);
  }

  public disconnect(dest: TrackedAudioNode) {
    if (!this._destinations.has(dest)) {
      console.warn("Can't disconnect destination that's not present");
      return;
    }
    this.node.disconnect(dest.node);
    this._destinations.delete(dest);
  }

  public disconnectAll() {
    for (const dest of this._destinations) {
      this.disconnect(dest);
    }
  }
}
