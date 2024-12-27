import type { SBoolean, SString } from "structured-state";
import type { AudioContextInfo } from "../lib/initAudioContext";
import type { TrackedAudioNode } from "./TrackedAudioNode";

export interface DSPStep<I extends TrackedAudioNode | null = TrackedAudioNode> {
  readonly effectId: string;

  readonly name: SString;
  readonly bypass: SBoolean;

  inputNode(): I;
  outputNode(): TrackedAudioNode;

  cloneToOfflineContext(context: OfflineAudioContext, offlineContextInfo: AudioContextInfo): Promise<DSPStep | null>;
}
