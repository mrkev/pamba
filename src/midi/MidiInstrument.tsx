import type { WamNode, WamParameterDataMap, WebAudioModule } from "@webaudiomodules/api";
import { boolean, SString, string } from "structured-state";
import { liveAudioContext } from "../constants";
import { SMidiInstrument } from "../data/serializable";
import { DSPStep } from "../dsp/DSPStep";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";
import { appEnvironment, WAMAvailablePlugin } from "../lib/AppEnvironment";
import { LinkedState } from "../lib/state/LinkedState";
import { assert, nullthrows } from "../utils/nullthrows";
import { Position } from "../wam/WindowPanel";
import { WAMImport } from "../wam/wam";
import { PambaWamNode } from "../wam/PambaWamNode";

// TODO: merge with PambaWamNode??
export class MidiInstrument implements DSPStep<null> {
  readonly effectId: string;
  readonly name: SString;
  readonly bypass = boolean(false);

  // WAM
  readonly node: TrackedAudioNode<WamNode>;

  public inputNode(): null {
    return null;
  }
  public outputNode(): TrackedAudioNode {
    return this.node;
  }

  async serialize(): Promise<SMidiInstrument> {
    console.log({
      kind: "MidiInstrument",
      url: this.url,
      state: await this.getState(),
    });
    return {
      kind: "MidiInstrument",
      url: this.url,
      state: await this.getState(),
    };
  }

  // Window Panel
  readonly windowPanelPosition = LinkedState.of<Position>([10, 10]);

  constructor(
    readonly wamInstance: WebAudioModule<WamNode>,
    readonly url: string,
    readonly dom: Element,
  ) {
    this.node = TrackedAudioNode.of(this.wamInstance.audioNode);
    this.effectId = this.wamInstance.moduleId;
    this.name = string(this.wamInstance.descriptor.name);
    this.url = url;
  }

  public destroy() {
    appEnvironment.openEffects.delete(this);
    if (this.dom) {
      this.wamInstance.destroyGui(this.dom);
    }
  }

  static async fromImportAtURL(
    wamImport: WAMImport,
    wamURL: string,
    hostGroupId: string,
    audioCtx: BaseAudioContext,
    state: unknown | null,
  ) {
    const wamInstance = await wamImport.createInstance(hostGroupId, audioCtx);
    if (state != null) {
      await wamInstance.audioNode.setState(state);
    }
    const wamDom = await wamInstance.createGui();
    // const paramInfo = await wamInstance.audioNode.getParameterInfo();
    // const paramValues = await wamInstance.audioNode.getParameterValues();
    return new MidiInstrument(wamInstance, wamURL, wamDom);
  }

  static async createFromUrl(pluginUrl: string, wamHostGroupId: string, audioContext: BaseAudioContext) {
    const { plugin, localDesc } = nullthrows(appEnvironment.wamPlugins.get(pluginUrl));
    assert(localDesc.kind === "m-a", "plugin is not an instrument");
    const wamInstance = await plugin.import.createInstance(wamHostGroupId, audioContext);
    const wamDom = await wamInstance.createGui();
    return new MidiInstrument(wamInstance, pluginUrl, wamDom);
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
