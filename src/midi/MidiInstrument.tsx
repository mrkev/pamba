import type { WamNode, WamParameterDataMap, WebAudioModule } from "@webaudiomodules/api";
import { boolean, SString, string } from "structured-state";
import { liveAudioContext } from "../constants";
import { DSPStep } from "../dsp/DSPStep";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";
import { appEnvironment, WAMAvailablePlugin } from "../lib/AppEnvironment";
import { LinkedState } from "../lib/state/LinkedState";
import { assert, nullthrows } from "../utils/nullthrows";
import { PambaWamNode } from "../wam/PambaWamNode";
import { Position } from "../ui/WindowPanel";

// TODO: merge with PambaWamNode??
export class MidiInstrument implements DSPStep<null> {
  readonly effectId: string;
  readonly name: SString;
  readonly bypass = boolean(false);

  // Window Panel
  readonly windowPanelPosition: LinkedState<Position>;

  public inputNode(): null {
    return null;
  }
  public outputNode(): TrackedAudioNode {
    return this.pambaWam.outputNode();
  }

  constructor(
    readonly pambaWam: PambaWamNode,
    readonly wamInstance: WebAudioModule<WamNode>,
    readonly url: string,
  ) {
    this.effectId = this.wamInstance.moduleId;
    this.name = string(this.wamInstance.descriptor.name);
    this.url = url;
    this.windowPanelPosition = pambaWam.windowPanelPosition;
  }

  public destroy() {
    appEnvironment.openEffects.delete(this);
    this.pambaWam.destroy();
  }

  static async createFromUrl(pluginUrl: string, wamHostGroupId: string, audioContext: BaseAudioContext) {
    const { localDesc } = nullthrows(appEnvironment.wamPlugins.get(pluginUrl));
    assert(localDesc.kind === "m-a", "plugin is not an instrument");
    const pambaWamNode = nullthrows(await PambaWamNode.fromURLAndState(pluginUrl, null, wamHostGroupId, audioContext));
    return new MidiInstrument(pambaWamNode, pambaWamNode.wamInstance, pambaWamNode.url);
  }

  static async createFromPlugin(insturment: WAMAvailablePlugin & { pluginKind: "m-a" }) {
    const wamHostGroupId = nullthrows(appEnvironment.wamHostGroup.get())[0];
    const instrument = await MidiInstrument.createFromUrl(insturment.url, wamHostGroupId, liveAudioContext());
    return instrument;
  }

  cloneToOfflineContext<MidiInstrument>(
    _context: OfflineAudioContext,
    _offlineContextInfo: Readonly<{ wamHostGroup: [id: string, key: string] }>,
  ): Promise<MidiInstrument | null> {
    throw new Error("Method not implemented.");
  }

  // TODO
  // private async setTest() {
  //   const msg = { 2: { id: 2, value: 1.0 } } as any; // for some reason, the id is typed as string but only works if its a number
  //   await this.module.audioNode.setParameterValues(msg);
  // }

  async getState(): Promise<WamParameterDataMap> {
    // for some reason this.module.audioNode.getState() returns undefined, so
    // using .getParameterValues() instead
    // const state = await this.module.audioNode.getParameterValues();
    // return state;

    const state = await this.wamInstance.audioNode.getState();
    return state;
  }

  async setState(state: WamParameterDataMap) {
    console.log(state);
    await this.wamInstance.audioNode.setState(state);
    // TODO: not working with OBXD because getParameterValues returns nothing
    // await this.module.audioNode.setParameterValues(state);
  }

  async actualCloneToOfflineContext(
    context: OfflineAudioContext,
    offlineContextInfo: Readonly<{ wamHostGroup: [id: string, key: string] }>,
  ): Promise<MidiInstrument | null> {
    const state = await this.getState();
    console.log("with state", state);
    const {
      wamHostGroup: [wamHostGroupId],
    } = offlineContextInfo;

    const clonedInstrument = await MidiInstrument.createFromUrl(this.url, wamHostGroupId, context);
    if (clonedInstrument == null) {
      return null;
    }

    await clonedInstrument.setState(state);
    return clonedInstrument;
  }
}
