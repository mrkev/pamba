import { WamEventMap, WebAudioModule } from "@webaudiomodules/api";
import { EmptyObj } from "../../utils/types";
import { WamNode } from "@webaudiomodules/sdk";

export class AudioTrackNode extends WamNode {
  override readonly _supportedEventTypes: Set<keyof WamEventMap> = new Set(["wam-automation", "wam-transport"]);

  constructor(module: WebAudioModule, options: AudioWorkletNodeOptions) {
    super(module, {
      ...options,
      // A pure source: no inputs, one stereo output. (Without an explicit
      // outputChannelCount the output's channel count would follow the
      // unconnected input's, ie, mono.)
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
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
