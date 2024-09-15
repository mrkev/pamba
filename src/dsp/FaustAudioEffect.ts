import type { FaustUIGroup, FaustUIInputItem, FaustUIOutputItem, IFaustMonoWebAudioNode } from "@grame/faustwasm";
import { boolean } from "structured-state";
import { LinkedMap } from "../lib/state/LinkedMap";
import { DSPNode } from "./DSPNode";
import { FaustEffectID, FAUST_EFFECTS } from "./FAUST_EFFECTS";

export type ProcessorLoader = (
  context: BaseAudioContext
) => Promise<{ faustNode: IFaustMonoWebAudioNode; dspMeta: any } | null | undefined>;

// from: https://github.com/Fr0stbyteR/faust-ui/blob/7665c7a754b4f856a5b60b7148963e263bf45e14/src/types.d.ts#L23
export interface LayoutTypeMap {
  vgroup: FaustUIGroup;
  hgroup: FaustUIGroup;
  tgroup: FaustUIGroup;
  hbargraph: FaustUIOutputItem;
  vbargraph: FaustUIOutputItem;
  led: FaustUIOutputItem;
  numerical: FaustUIOutputItem;
  vslider: FaustUIInputItem;
  hslider: FaustUIInputItem;
  button: FaustUIInputItem;
  checkbox: FaustUIInputItem;
  nentry: FaustUIInputItem;
  knob: FaustUIInputItem;
  menu: FaustUIInputItem;
  radio: FaustUIInputItem;
}

type TFaustUIItem = LayoutTypeMap[keyof LayoutTypeMap];

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

export class FaustAudioEffect extends DSPNode<AudioNode> {
  private readonly node: IFaustMonoWebAudioNode;
  readonly effectId: FaustEffectID;
  readonly ui: Array<TFaustUIItem>;
  readonly name: string;
  readonly params: LinkedMap<string, number>;

  // TODO: serialize
  override readonly bypass = boolean(false);

  private constructor(
    faustNode: IFaustMonoWebAudioNode,
    nodeData: INodeData,
    effectId: FaustEffectID,
    params: Array<[string, number]>
  ) {
    super();
    this.effectId = effectId;
    this.node = faustNode;
    this.ui = nodeData.ui;
    this.name = nodeData.name;
    this.params = LinkedMap.create(new Map(params));
    for (const [address, value] of params) {
      // Note: `node.getParams` will return an
      // outdated value until playback happens.
      // On playback the value will be correct though.
      this.node.setParamValue(address, value);
    }
  }

  override inputNode(): AudioNode {
    return this.node;
  }
  override outputNode(): AudioNode | DSPNode<AudioNode> {
    return this.node;
  }

  setParam(address: string, value: number): void {
    this.params.set(address, value);
    this.node.setParamValue(address, value);
  }

  getParam(address: string): number {
    const value = this.params.get(address);
    if (value == null) {
      throw new Error(`Invalid address for effect param: ${address}`);
    }
    return value;
  }

  public destroy() {
    this.node.destroy();
  }

  public accessAudioNode(): AudioNode {
    return this.node;
  }

  async getAllParamValues(): Promise<Array<[address: string, value: number]>> {
    // const state = await this.node.getState();
    // This will only be the up-to-date state once playback happens
    // console.log("saving state", [...this.params.entries()]);
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
    const result = await creator(context);
    if (!result) {
      return null;
    }

    const { faustNode: node, dspMeta: _ } = result;
    // By default faust nodes seem to be created with channelCountMode = "explicit"
    // We need "max", not only because it's what makes sense, but also so it works
    // automatically with the rest of the DSP chain
    node.channelCountMode = "max";
    const nodeData: INodeData = JSON.parse((node as any).getJSON());

    const useParamValues =
      // Provided param values
      initialParamValues ??
      // default
      node.getParams().map((key) => {
        return [key, node.getParamValue(key)];
      });

    const effect = new this(node, nodeData, id, useParamValues);
    return effect;
  }

  async cloneToOfflineContext(context: OfflineAudioContext) {
    const paramValues = await this.getAllParamValues();
    console.log("CLONING", paramValues);
    return FaustAudioEffect.create(context, this.effectId, paramValues);
  }
}
