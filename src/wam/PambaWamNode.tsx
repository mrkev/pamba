import { WamNode as IWamNode, WamParameterDataMap, WamParameterInfoMap } from "@webaudiomodules/api";
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
  readonly windowPanelPosition = LinkedState.of<Position>([10, 10]);

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
    readonly wamInstance: WebAudioModule<IWamNode>,
    readonly dom: Element,
    readonly url: string,
    readonly parameterInfo: WamParameterInfoMap,
    readonly parameterValues: WamParameterDataMap,
  ) {
    this.node = TrackedAudioNode.of(wamInstance.audioNode);
    this.effectId = this.wamInstance.moduleId;
    this.name = string(this.wamInstance.descriptor.name);
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
    const paramInfo = await wamInstance.audioNode.getParameterInfo();
    const paramValues = await wamInstance.audioNode.getParameterValues();
    return new PambaWamNode(wamInstance, wamDom, wamURL, paramInfo, paramValues);
  }

  // TODO: simplify now that we pre-fetch wam plugins?
  static async fromURLAndState(
    pluginUrl: string,
    state: unknown | null,
    hostGroupId: string,
    audioCtx: BaseAudioContext,
  ) {
    console.log("WAM: LOADING fromURL", pluginUrl);
    const rawModule = await import(/* @vite-ignore */ pluginUrl);
    if (rawModule == null) {
      console.error("could not import", rawModule);
      return null;
    }
    const wamImport: WAMImport = rawModule.default;
    return PambaWamNode.fromImportAtURL(wamImport, pluginUrl, hostGroupId, audioCtx, state);
  }

  public async cloneToOfflineContext(
    context: OfflineAudioContext,
    offlineContextInfo: AudioContextInfo,
  ): Promise<PambaWamNode | null> {
    const {
      wamHostGroup: [wamHostGroupId],
    } = offlineContextInfo;

    const state = await this.getState();
    const pambaWamNode = await PambaWamNode.fromURLAndState(this.url, state, wamHostGroupId, context);
    if (pambaWamNode == null) {
      return null;
    }

    return pambaWamNode;
  }
}
