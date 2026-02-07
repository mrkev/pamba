import { WamNode as IWamNode, WamParameterDataMap, WamParameterInfoMap } from "@webaudiomodules/api";
import { MarkedValue } from "marked-subbable";
import { boolean, SString, string } from "structured-state";
import type { WebAudioModule } from "../../packages/sdk/dist";
import { DSPStep } from "../dsp/DSPStep";
import { TrackedAudioNode } from "../dsp/TrackedAudioNode";
import { appEnvironment } from "../lib/AppEnvironment";
import { AudioContextInfo } from "../lib/initAudioContext";
import { Position } from "../ui/WindowPanel";
import { WAMImport } from "./fetchWam";
import { WAMAvailablePlugin } from "./plugins";

export class PambaWamNode implements DSPStep {
  readonly effectId: string;
  readonly bypass = boolean(false);

  public inputNode(): TrackedAudioNode {
    return this.node;
  }

  public outputNode(): TrackedAudioNode {
    return this.node;
  }

  // WAM
  readonly node: TrackedAudioNode<IWamNode>;

  // Window Panel
  readonly windowPanelPosition = MarkedValue.create<Position>([10, 10]);

  public destroy() {
    this.wamInstance.destroyGui(this.dom);
    appEnvironment.openEffects.delete(this);
  }

  async getState(): Promise<unknown> {
    const state: unknown = await this.wamInstance.audioNode.getState();
    return state;
  }

  async setState(state: unknown) {
    await this.wamInstance.audioNode.setState(state);
  }

  private constructor(
    // WAM
    readonly name: SString,
    readonly wamInstance: WebAudioModule<IWamNode>,
    readonly dom: Element,
    readonly url: string,
    readonly parameterInfo: WamParameterInfoMap,
    readonly parameterValues: WamParameterDataMap,
  ) {
    this.node = TrackedAudioNode.of(wamInstance.audioNode);
    this.effectId = this.wamInstance.moduleId;
  }

  static async fromAvailablePlugin(
    availablePlugin: WAMAvailablePlugin,
    hostGroupId: string,
    audioCtx: BaseAudioContext,
    state: unknown | null,
  ) {
    const wamInstance = await availablePlugin.import.createInstance(hostGroupId, audioCtx);
    if (state != null) {
      await wamInstance.audioNode.setState(state);
    }
    const wamDom = await wamInstance.createGui();
    const paramInfo = await wamInstance.audioNode.getParameterInfo();
    const paramValues = await wamInstance.audioNode.getParameterValues();
    return new PambaWamNode(
      string(availablePlugin.name),
      wamInstance,
      wamDom,
      availablePlugin.url,
      paramInfo,
      paramValues,
    );
  }

  public async cloneToOfflineContext(
    context: OfflineAudioContext,
    offlineContextInfo: AudioContextInfo,
  ): Promise<PambaWamNode | null> {
    const {
      wamHostGroup: [wamHostGroupId],
    } = offlineContextInfo;

    const state = await this.getState();

    const rawModule = await import(/* @vite-ignore */ this.url);
    if (rawModule == null) {
      console.error("could not import", rawModule);
      return null;
    }

    const wamImport: WAMImport = rawModule.default;

    const wamInstance = await wamImport.createInstance(wamHostGroupId, context);
    if (state != null) {
      await wamInstance.audioNode.setState(state);
    }

    const wamDom = await wamInstance.createGui();
    const paramInfo = await wamInstance.audioNode.getParameterInfo();
    const paramValues = await wamInstance.audioNode.getParameterValues();
    return new PambaWamNode(string(this.name.get()), wamInstance, wamDom, this.url, paramInfo, paramValues);
  }
}
