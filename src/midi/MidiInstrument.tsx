import type { WamNode, WamParameterDataMap, WebAudioModule } from "@webaudiomodules/api";
import { boolean, SString, string } from "structured-state";
import { liveAudioContext } from "../constants";
import { DSPStep } from "../dsp/DSPStep";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";
import { appEnvironment, liveWamHostGroupId } from "../lib/AppEnvironment";
import { assert, nullthrows } from "../utils/nullthrows";
import { PambaWamNode } from "../wam/PambaWamNode";
import { WAMAvailablePlugin } from "../wam/plugins";
import { isInstrumentPlugin } from "./isInstrumentPlugin";

// TODO: merge with PambaWamNode??
export class MidiInstrument implements DSPStep<null> {
  readonly effectId: string;
  readonly name: SString;
  readonly bypass = boolean(false);

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
  }

  public destroy() {
    appEnvironment.openEffects.delete(this);
    this.pambaWam.destroy();
  }

  static async createFromInstrumentPlugin(
    plugin: WAMAvailablePlugin & { pluginKind: "m-a" },
    hostGroupId: string = liveWamHostGroupId(),
    audioCtx: BaseAudioContext = liveAudioContext(),
    state: unknown | null = null,
  ) {
    assert(plugin.pluginKind === "m-a", "plugin is not an instrument");
    const pambaWamNode = await PambaWamNode.fromAvailablePlugin(plugin, hostGroupId, audioCtx, state);
    return new MidiInstrument(pambaWamNode, pambaWamNode.wamInstance, pambaWamNode.url);
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

    const plugin = nullthrows(
      appEnvironment.wamPlugins.get(this.url),
      `unexpected unavailable instrument: ${this.url}`,
    );

    if (!isInstrumentPlugin(plugin)) {
      throw new Error("unexpected instrument plugin is no longer an instrument");
    }

    const clonedInstrument = await MidiInstrument.createFromInstrumentPlugin(plugin, wamHostGroupId, context);
    if (clonedInstrument == null) {
      return null;
    }

    // todo: set state here vs when cloning?
    await clonedInstrument.setState(state);
    return clonedInstrument;
  }
}
