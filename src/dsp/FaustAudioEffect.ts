import type {
  FaustDspMeta,
  FaustUIDescriptor,
  FaustUIGroup,
  FaustUIInputItem,
  FaustUIOutputItem,
  IFaustMonoWebAudioNode,
} from "@grame/faustwasm";
import { SBoolean, SMap, SString, string } from "structured-state";
import { DSPStep } from "./DSPStep";
import { FAUST_EFFECTS, FaustEffectID } from "./FAUST_EFFECTS";
import { TrackedAudioNode } from "./TrackedAudioNode";

// export type ProcessorLoader = (
//   context: BaseAudioContext,
// ) => Promise<{ faustNode: IFaustMonoWebAudioNode; dspMeta: FaustDspMeta } | null | undefined>;

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

export class FaustAudioEffect implements DSPStep<TrackedAudioNode> {
  private readonly faustNode: TrackedAudioNode<IFaustMonoWebAudioNode>;
  public readonly effectId: FaustEffectID;
  public readonly ui: FaustUIDescriptor;
  public readonly name: SString;
  public readonly params: SMap<string, number>;

  // TODO: serialize
  readonly bypass = SBoolean.create(false);

  private constructor(
    faustNode: IFaustMonoWebAudioNode,
    dspMeta: FaustDspMeta,
    effectId: FaustEffectID,
    params: Array<[string, number]>,
  ) {
    this.effectId = effectId;
    this.faustNode = TrackedAudioNode.of(faustNode);
    this.ui = dspMeta.ui;
    this.name = string(dspMeta.name);
    this.params = SMap.create(new Map(params));
    for (const [address, value] of params) {
      // Note: `node.getParams` will return an
      // outdated value until playback happens.
      // On playback the value will be correct though.
      this.faustNode.get().setParamValue(address, value);
    }
  }

  public inputNode(): TrackedAudioNode {
    return this.faustNode;
  }
  public outputNode(): TrackedAudioNode {
    return this.faustNode;
  }

  public setParam(address: string, value: number): void {
    this.params.set(address, value);
    this.faustNode.get().setParamValue(address, value);
  }

  public getParam(address: string): number {
    const value = this.params.get(address);
    if (value == null) {
      throw new Error(`Invalid address for effect param: ${address}`);
    }
    return value;
  }

  public destroy() {
    this.faustNode.get().destroy();
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
    initialParamValues?: Array<[address: string, value: number]>,
  ): Promise<FaustAudioEffect | null> {
    const mod = await FAUST_EFFECTS[id]();
    const result = await mod.default(context);
    if (result == null) {
      return null;
    }

    const { faustNode: node, dspMeta } = result;

    // By default faust nodes seem to be created with channelCountMode = "explicit"
    // We need "max", not only because it's what makes sense, but also so it works
    // automatically with the rest of the DSP chain
    node.channelCountMode = "max";

    const useParamValues =
      // Provided param values
      initialParamValues ??
      // default
      node.getParams().map((key) => {
        return [key, node.getParamValue(key)];
      });

    const effect = new this(node, dspMeta, id, useParamValues);
    return effect;
  }

  async cloneToOfflineContext(context: OfflineAudioContext) {
    const paramValues = await this.getAllParamValues();
    console.log("CLONING", paramValues);
    return FaustAudioEffect.create(context, this.effectId, paramValues);
  }
}
