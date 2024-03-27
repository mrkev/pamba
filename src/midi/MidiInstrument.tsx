import type { WamNode, WamParameterDataMap, WebAudioModule } from "@webaudiomodules/api";
import { DSPNode } from "../dsp/DSPNode";
import { appEnvironment } from "../lib/AppEnvironment";
import { LinkedState } from "../lib/state/LinkedState";
import { nullthrows, assert } from "../utils/nullthrows";
import { Position } from "../wam/WindowPanel";

export class MidiInstrument extends DSPNode<null> {
  override effectId: string;
  override name: string;
  readonly url: string;

  // WAM
  readonly module: WebAudioModule<WamNode>;
  public dom: Element | null;

  override inputNode(): null {
    return null;
  }
  override outputNode(): AudioNode | DSPNode<AudioNode> {
    return this.module.audioNode;
  }

  // Window Panel
  readonly windowPanelPosition = LinkedState.of<Position>([10, 10]);

  constructor(module: WebAudioModule<WamNode>, url: string) {
    super();
    this.module = module;
    this.effectId = this.module.moduleId;
    this.name = this.module.descriptor.name;
    this.dom = null;
    this.url = url;
    (window as any).inst = this;
  }

  public destroy() {
    if (this.dom) {
      this.module.destroyGui(this.dom);
    }
  }

  static async createFromUrl(pluginUrl: string, wamHostGroupId: string, audioContext: BaseAudioContext) {
    // console.log(pluginUrl, appEnvironment.wamPlugins);
    const plugin = nullthrows(appEnvironment.wamPlugins.get(pluginUrl));
    assert(plugin.kind === "m-a", "plugin is not an instrument");

    const module = await plugin.import.createInstance(wamHostGroupId, audioContext);
    return new MidiInstrument(module, pluginUrl);
  }

  cloneToOfflineContext<MidiInstrument>(
    _context: OfflineAudioContext,
    _offlineContextInfo: Readonly<{ wamHostGroup: [id: string, key: string] }>,
  ): Promise<MidiInstrument | null> {
    throw new Error("Method not implemented.");
  }

  // TODO
  private async setTest() {
    const msg = { 2: { id: 2, value: 1.0 } } as any; // for some reason, the id is typed as string but only works if its a number
    await this.module.audioNode.setParameterValues(msg);
  }

  async getState(): Promise<WamParameterDataMap> {
    // for some reason this.module.audioNode.getState() returns undefined, so
    // using .getParameterValues() instead
    const state = await this.module.audioNode.getParameterValues();
    return state;
  }

  async setState(state: WamParameterDataMap) {
    console.log(state);
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
