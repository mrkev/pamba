// faust-modules.d.ts
declare module "*.dsp" {
  import { ProcessorLoader } from "faust-loader";
  const loader: ProcessorLoader;
  export = loader;
}
