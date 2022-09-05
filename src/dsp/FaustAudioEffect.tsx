import { TFaustUIItem } from "@shren/faust-ui/src/types";
import { FaustAudioProcessorNode, ProcessorLoader } from "faust-loader";
import { LinkedMap } from "../lib/state/LinkedMap";
import { EffectID, FAUST_EFFECTS } from "./FAUST_EFFECTS";

export interface INodeData {
  compile_options: string;
  filename: string;
  include_pathnames: Array<string>;
  inputs: number;
  library_list: Array<string>;
  meta: Array<any>;
  name: string;
  outputs: number;
  size: number;
  ui: Array<TFaustUIItem>;
  version: string;
}

export type FaustNodeSetParamFn = (address: string, value: number) => void;

export class FaustAudioEffect {
  private readonly node: FaustAudioProcessorNode;
  readonly effectId: EffectID;
  readonly ui: Array<TFaustUIItem>;
  readonly name: string;
  readonly params: LinkedMap<string, number>;

  private constructor(
    faustNode: FaustAudioProcessorNode,
    nodeData: INodeData,
    effectId: EffectID,
    params: Array<[string, number]>
  ) {
    this.effectId = effectId;
    this.node = faustNode;
    this.ui = nodeData.ui;
    this.name = nodeData.name;
    (window as any).n = this;
    this.params = LinkedMap.create(new Map(params));
    for (const [address, value] of params) {
      // Note: `node.getParams` will return an
      // outdated value until playback happens.
      // On playback the value will be correct though.
      this.node.setParam(address, value);
    }
  }

  setParam(address: string, value: number): void {
    this.params.set(address, value);
    this.node.setParam(address, value);
  }

  getParam(address: string): number {
    console.log("GETTING", this.node.getParam(address));
    const value = this.params.get(address);
    if (!value) {
      throw new Error(`Invalid address for effect param: ${address}`);
    }
    return value;
  }

  destroy() {
    this.node.destroy();
  }

  accessWorkletNode() {
    return this.node;
  }

  async getAllParamValues(): Promise<Array<[address: string, value: number]>> {
    // const state = await this.node.getState();
    // This will only be the up-to-date state once playback happens
    console.log("saving state", [...this.params.entries()]);
    // We use our params state instead of trying to `await this.node.getState()`
    // because that seems to return outdated values unless playback happens
    return [...this.params.entries()];
  }

  static async create(
    context: BaseAudioContext,
    id: keyof typeof FAUST_EFFECTS,
    initialParamValues?: Array<[address: string, value: number]>
  ): Promise<FaustAudioEffect | null> {
    const mod: { default: ProcessorLoader } = await FAUST_EFFECTS[id]();
    const creator = mod.default;
    const node = await creator(context);
    if (!node) {
      return null;
    }
    const nodeData: INodeData = JSON.parse((node as any).getJSON());
    const effect = new this(node, nodeData, id, initialParamValues ?? []);
    return effect;
  }

  async cloneToOfflineContext(context: OfflineAudioContext) {
    const paramValues = await this.getAllParamValues();
    return FaustAudioEffect.create(context, this.effectId, paramValues);
  }
}
