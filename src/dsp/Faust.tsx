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

// function FaustTest({ context }: { context: AudioContext }) {
//   const [node, setNode] = useState<null | FaustAudioProcessorNode>(null);
//   const [ui, setUi] = useState<Array<TFaustUIItem>>([]);
//   useEffect(() => {
//     (async function () {
//       const createPanner = await import("./Panner.dsp");

//       const panner = await createPanner.default(context);
//       if (!panner) {
//         return;
//       }
//       const nodeData: INodeData = JSON.parse((panner as any).getJSON());
//       const { ui } = nodeData;
//       setNode(panner || null);
//       setUi(ui);
//     })();
//   }, [context]);

//   if (!node || !ui) {
//     return null;
//   }

//   return <FaustEffectModule ui={ui} setParam={node.setParam} />;
// }

export abstract class FaustAudioEffect {
  node: FaustAudioProcessorNode;
  data: INodeData;
  ui: Array<TFaustUIItem>;

  constructor(faustNode: FaustAudioProcessorNode) {
    this.node = faustNode;
    (window as any).nn = faustNode;
    const nodeData: INodeData = JSON.parse((faustNode as any).getJSON());
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
