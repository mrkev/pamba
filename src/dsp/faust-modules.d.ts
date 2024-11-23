// faust-modules.d.ts
declare module "*.dsp" {
  import type { FaustDspMeta, IFaustMonoWebAudioNode } from "@grame/faustwasm";

  type ProcessorLoader = (
    context: BaseAudioContext,
  ) => Promise<{ faustNode: IFaustMonoWebAudioNode; dspMeta: FaustDspMeta } | null | undefined>;

  const loader: ProcessorLoader;
  export = loader;
}
