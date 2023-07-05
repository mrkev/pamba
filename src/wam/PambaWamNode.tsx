import { WamNode as IWamNode } from "@webaudiomodules/api";
import type { WebAudioModule } from "../../packages/sdk/dist";
import { DSPNode } from "../dsp/DSPNode";
import { OfflineContextInfo } from "../lib/initAudioContext";
import { SPrimitive } from "../lib/state/LinkedState";
import { Position } from "./WindowPanel";
import { WAMImport } from "./wam";

export class PambaWamNode extends DSPNode {
  override name: string;
  override effectId: string;
  readonly url: string;

  override inputNode(): AudioNode {
    return this.module.audioNode;
  }
  override outputNode(): AudioNode | DSPNode<AudioNode> {
    return this.module.audioNode;
  }

  // WAM
  readonly module: WebAudioModule<IWamNode>;
  readonly dom: Element;

  // Window Panel
  readonly windowPanelPosition = SPrimitive.of<Position>([10, 10]);

  public destroy() {
    this.module.destroyGui(this.dom);
  }

  async getState(): Promise<unknown> {
    const state: unknown = await this.module.audioNode.getState();
    return state;
  }

  async setState(state: unknown) {
    await this.module.audioNode.setState(state);
  }

  private constructor(module: WebAudioModule<IWamNode>, dom: Element, url: string) {
    super();
    this.module = module;
    this.dom = dom;
    this.effectId = this.module.moduleId;
    this.name = this.module.descriptor.name;
    this.url = url;
  }

  static async fromURL(pluginUrl: string, hostGroupId: string, audioCtx: BaseAudioContext) {
    console.log("WAM: LOADING fromURL", pluginUrl);
    const rawModule = await import(/* @vite-ignore */ pluginUrl);
    if (rawModule == null) {
      console.error("could not import", rawModule);
      return null;
    }
    const WAM1: WAMImport = rawModule.default;
    let pluginInstance1 = await WAM1.createInstance(hostGroupId, audioCtx);
    let pluginDom1 = await pluginInstance1.createGui();
    return new PambaWamNode(pluginInstance1, pluginDom1, pluginUrl);
  }

  override async cloneToOfflineContext(
    context: OfflineAudioContext,
    offlineContextInfo: OfflineContextInfo
  ): Promise<PambaWamNode | null> {
    const state = await this.getState();
    const {
      wamHostGroup: [wamHostGroupId],
    } = offlineContextInfo;

    const pambaWamNode = await PambaWamNode.fromURL(this.url, wamHostGroupId, context);
    if (pambaWamNode == null) {
      return null;
    }

    await pambaWamNode.setState(state);
    return pambaWamNode;
  }
}
