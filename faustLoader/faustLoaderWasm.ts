import * as FaustWasm from "@grame/faustwasm/dist/esm/index";
import * as path from "path";
import { DirectoryResult } from "tmp-promise";
import { nullthrows } from "./FaustLoader";

const { instantiateFaustModuleFromFile, LibFaust, FaustMonoDspGenerator, FaustCompiler } = FaustWasm;

const faustModulePath = path.join(__dirname, "../node_modules/@grame/faustwasm/libfaust-wasm/libfaust-wasm.js");

export async function faustLoaderWasmImpl(
  emitFile: (name: string, source: string | Uint8Array, contentType?: string) => string,
  name: string,
  content: string,
  workDir: DirectoryResult,
): Promise<{ wasm: string; json: string }> {
  if (name == null) {
    throw new Error("undefined or null name");
  }

  // initialize the libfaust wasm
  const faustModule = await instantiateFaustModuleFromFile(faustModulePath);
  const libFaust = new LibFaust(faustModule);
  console.log("using libfaust", libFaust.version());

  // create compiler and generator
  const compiler = new FaustCompiler(libFaust);
  const generator = new FaustMonoDspGenerator();

  // compile
  const dspName = name;
  await generator.compile(compiler, dspName, content, ["-I", "libraries/"].join(" "));

  // write resulting files
  const factory = nullthrows(generator.factory);
  const wasmOut = emitFile(name + ".wasm", factory.code, "application/wasm");
  const jsonOut = emitFile(name + ".json", factory.json, "application/json");

  // const dspPath = path.resolve(workDir.path, dspName);
  // await writeFile(dspPath, content);

  return { wasm: wasmOut, json: jsonOut };
}
