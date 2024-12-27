import { WamNode as IWamNode } from "@webaudiomodules/api";
import { boolean, SString, string } from "structured-state";
import type { WebAudioModule } from "../../packages/sdk/dist";
import { DSPStep } from "../dsp/DSPStep";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioContextInfo } from "../lib/initAudioContext";
import { LinkedState } from "../lib/state/LinkedState";
import { Position } from "./WindowPanel";
import { WAMImport } from "./wam";

export class PambaWamNode implements DSPStep {
  readonly name: SString;
  readonly effectId: string;
  readonly url: string;
  readonly bypass = boolean(false);

  public inputNode(): TrackedAudioNode {
    return this.node;
  }

  public outputNode(): TrackedAudioNode {
    return this.node;
  }

  // WAM
  readonly module: WebAudioModule<IWamNode>;
  readonly node: TrackedAudioNode<IWamNode>;
  readonly dom: Element;

  // Window Panel
  readonly windowPanelPosition = LinkedState.of<Position>([10, 10]);

  public destroy() {
    this.module.destroyGui(this.dom);
    appEnvironment.openEffects.delete(this);
  }

  async getState(): Promise<unknown> {
    const state: unknown = await this.module.audioNode.getState();
    return state;
  }

  async setState(state: unknown) {
    await this.module.audioNode.setState(state);
  }

  constructor(module: WebAudioModule<IWamNode>, dom: Element, url: string) {
    this.module = module;
    this.node = TrackedAudioNode.of(module.audioNode);
    this.dom = dom;
    this.effectId = this.module.moduleId;
    this.name = string(this.module.descriptor.name);
    this.url = url;
  }

  // TODO: simplify now that we pre-fetch wam plugins?
  static async fromURL(pluginUrl: string, hostGroupId: string, audioCtx: BaseAudioContext) {
    console.log("WAM: LOADING fromURL", pluginUrl);
    const rawModule = await import(/* @vite-ignore */ pluginUrl);
    if (rawModule == null) {
      console.error("could not import", rawModule);
      return null;
    }
    const WAM1: WAMImport = rawModule.default;
    const pluginInstance1 = await WAM1.createInstance(hostGroupId, audioCtx);
    const pluginDom1 = await pluginInstance1.createGui();
    return new PambaWamNode(pluginInstance1, pluginDom1, pluginUrl);
  }

  static async wrapModule(module: WebAudioModule<IWamNode>, url: string) {
    const pluginDom1 = await module.createGui();
    return new PambaWamNode(module, pluginDom1, url);
  }

  public async cloneToOfflineContext(
    context: OfflineAudioContext,
    offlineContextInfo: AudioContextInfo,
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
