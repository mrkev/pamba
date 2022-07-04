// import createPanner from "./Panner.dsp";
import { TFaustUIItem } from "@shren/faust-ui/src/types";
import { FaustAudioProcessorNode, ProcessorLoader } from "faust-loader";

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

export abstract class FaustAudioEffect {
  node: FaustAudioProcessorNode;
  data: INodeData;
  ui: Array<TFaustUIItem>;

  constructor(faustNode: FaustAudioProcessorNode) {
    const nodeData: INodeData = JSON.parse((faustNode as any).getJSON());
    this.node = faustNode;
    this.data = nodeData;
    this.ui = nodeData.ui;
  }

  static async create(context: AudioContext, importEffect: FaustEffectThunk): Promise<FaustAudioEffect | null> {
    const mod: { default: ProcessorLoader } = await importEffect();
    const creator = mod.default;
    const node = await creator(context);
    if (!node) {
      return null;
    }
    return new (this as any)(node);
  }
}

export type FaustEffectThunk = () => Promise<{ default: ProcessorLoader }>;

export const FAUST_EFFECTS = {
  PANNER: () => import("./Panner.dsp"),
  REVERB: () => import("./dattorro.dsp"),
} as const;
