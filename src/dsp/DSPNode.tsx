import type { SString, SBoolean } from "structured-state";
import { DSP } from "../lib/DSP";
import type { AudioContextInfo } from "../lib/initAudioContext";
import type { TrackedAudioNode } from "./TrackedAudioNode";

/** todo, eventaully make an interface probably */
export abstract class DSPStep<I extends TrackedAudioNode | null = TrackedAudioNode> {
  abstract readonly effectId: string;

  abstract readonly name: SString;
  abstract readonly bypass: SBoolean;

  abstract inputNode(): I;
  abstract outputNode(): TrackedAudioNode;

  abstract cloneToOfflineContext(
    context: OfflineAudioContext,
    offlineContextInfo: AudioContextInfo,
  ): Promise<DSPStep | null>;

  public connect(dest: TrackedAudioNode | DSPStep<TrackedAudioNode>): void {
    DSP.connect(this, dest);
  }

  public disconnect(dest: TrackedAudioNode | DSPStep<TrackedAudioNode>) {
    DSP.disconnect(this, dest);
  }

  public disconnectAll() {
    DSP.disconnectAll(this);
  }
}
