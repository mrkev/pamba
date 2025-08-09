import { WamEventMap, WebAudioModule } from "@webaudiomodules/api";
import { EmptyObj } from "../../utils/types";
import { WamNode } from "../../../packages/sdk/src";

export class AudioTrackNode extends WamNode {
  override readonly _supportedEventTypes: Set<keyof WamEventMap> = new Set(["wam-automation", "wam-transport"]);

  constructor(module: WebAudioModule, options: AudioWorkletNodeOptions) {
    super(module, {
      ...options,
      processorOptions: {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2],
      },
    });
  }

  // get issues if I don't set state to something
  override async getState(): Promise<EmptyObj> {
    return {};
  }

  override async setState(state: EmptyObj) {
    // ignorePromise(this.pianoRoll.setState(state));
  }
}
