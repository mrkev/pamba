import {
  FaustCompiler,
  FaustMonoDspGenerator,
  instantiateFaustModuleFromFile,
  LibFaust,
} from "@grame/faustwasm/dist/esm/index";
import { readFile } from "fs/promises";
import * as path from "path";
import { PluginContext } from "rollup";
import type { ResolvedConfig, ViteDevServer } from "vite";

const FAUST_MODULE_PATH = path.join(__dirname, "../node_modules/@grame/faustwasm/libfaust-wasm/libfaust-wasm.js");

const isDsp = (id: string) => /\.(dsp)$/.test(id);

export function nullthrows<T>(val: T | null | undefined, message?: string): T {
  if (val == null) {
    throw new Error(message || `Expected ${val} to be non nil.`);
  }
  return val;
}

export const createBasePath = (base?: string) => {
  return (base?.replace(/\/$/, "") || "") + "/@faustloader/";
};

type OutPackage = {
  wasm: string;
  json: string;
};

export class FaustLoader {
  public readonly name = "faust-lodaer-plugin";

  private resConfig: ResolvedConfig | null = null;
  private virtPath: string | null = null;

  // Essentially a virtual file system for when running in dev. path -> source, content type
  // ie, /@faustloader/Panner.wasm -> { source: '...', "application/wasm" }
  private virtFiles = new Map<string, { source: string | Uint8Array; contentType: string }>();

  // id -> paths for built assets.
  // If on dev-server, path looks like /@faustloader/Panner.wasm
  // If building, path looks like /assets/Panner-2lhy239.wasm (template looks like, " __VITE_ASSET__${fileHandle}__")
  private outFiles = new Map<string, OutPackage>();

  configResolved(resolvedConfig: ResolvedConfig) {
    // store the resolved config
    this.resConfig = resolvedConfig;
    // ie, /@faustloader/foo/bar/base/path/
    this.virtPath = createBasePath(this.resConfig.base);
    nullthrows(this.resConfig).logger.info("[config] " + this.virtPath);
  }

  async transform(_src: string, id: string) {
    if (!isDsp(id)) {
      return;
    }

    const name = path.parse(id).name;
    const res = this.outFiles.get(id);

    return {
      map: null,
      code: codeFor(res, name),
    };
  }

  async load(id: string, context: PluginContext) {
    if (!isDsp(id)) {
      return;
    }

    const emitFile = (name: string, source: string | Uint8Array, contentType: string): string => {
      if (context.meta.watchMode) {
        const virtualFilePath = this.virtPath + name;
        this.virtFiles.set(virtualFilePath, { source, contentType });
        nullthrows(this.resConfig).logger.info(`[load] watch emit: ${virtualFilePath}`);
        return virtualFilePath;
      } else {
        const fileHandle = context.emitFile({
          type: "asset",
          name,
          source,
        });
        const result = `__VITE_ASSET__${fileHandle}__`;
        // config?.logger.info(`[load] emmit out: ${result}`);
        return result;
      }
    };

    const name = path.parse(id).name;
    const src = await readFile(id, { encoding: "utf-8" });
    const files = await faustLoaderWasmImpl(emitFile, name, src);

    this.outFiles.set(id, files);

    nullthrows(this.resConfig).logger.info("[load] " + id);
  }

  configureServer(server: ViteDevServer) {
    server.middlewares.use((req, res, next) => {
      if (req.url && req.url.indexOf("Panner") > -1) {
        nullthrows(this.resConfig).logger.info(`[server] requesting ${req.url}`);
      }

      if (this.virtPath && req.url?.startsWith(this.virtPath)) {
        // const [, id] = req.url.split(virtPath);
        // config.logger.info(`[server] HIT: ${req.url} ${id}`);

        const file = this.virtFiles.get(req.url);

        if (!file) {
          throw new Error(`vite-faust-loader cannot find image with url "${req.url}" this is likely an internal error`);
        }

        nullthrows(this.resConfig).logger.info(`[server] SENDING: ${req.url}, ${file.source.length}`);

        // if (pluginOptions.removeMetadata === false) {
        //   image.withMetadata();
        // }${req.url}

        file.contentType && res.setHeader("Content-Type", file.contentType);
        // res.setHeader("Cache-Control", "max-age=360000");
        // return image.clone().pipe(res);
        return res.end(file.source);
      }

      next();
    });
  }
}

function codeFor(res: OutPackage | undefined, name: string) {
  return /* javascript */ `
/**
 * @typedef {import("./types").FaustDspDistribution} FaustDspDistribution
 * @typedef {import("./faustwasm").FaustAudioWorkletNode} FaustAudioWorkletNode
 * @typedef {import("./faustwasm").FaustDspMeta} FaustDspMeta
 */

/**
 * Creates a Faust audio node for use in the Web Audio API.
 *
 * @param {AudioContext} audioContext - The Web Audio API AudioContext to which the Faust audio node will be connected.
 * @param {string} dspName - The name of the DSP to be loaded.
 * @param {number} voices - The number of voices to be used for polyphonic DSPs.
 * @returns {Object} - An object containing the Faust audio node and the DSP metadata.
 */
const createFaustNode = async (audioContext, wasmPath, voices = 0) => {
  // Import necessary Faust modules and data
  const { FaustMonoDspGenerator, FaustPolyDspGenerator } = await import(
    "@grame/faustwasm"
  );
  const dspPath = wasmPath.replace(/\.wasm$/i, "");

  // Load DSP metadata from JSON
  /** @type {FaustDspMeta} */
  const dspMeta = await (await fetch(dspPath + ".json")).json();

  // Compile the DSP module from WebAssembly binary data
  const dspModule = await WebAssembly.compileStreaming(
    await fetch(dspPath + ".wasm")
  );

  // Create an object representing Faust DSP with metadata and module
  /** @type {FaustDspDistribution} */
  const faustDsp = { dspMeta, dspModule };

  /** @type {FaustAudioWorkletNode} */
  let faustNode;

  // Create either a polyphonic or monophonic Faust audio node based on the number of voices
  if (voices > 0) {
    // Try to load optional mixer and effect modules
    try {
      faustDsp.mixerModule = await WebAssembly.compileStreaming(
        await fetch("./mixerModule.wasm")
      );
      faustDsp.effectMeta = await (
        await fetch(dspPath + "_effect.json")
      ).json();
      faustDsp.effectModule = await WebAssembly.compileStreaming(
        await fetch(dspPath + "_effect.wasm")
      );
    } catch (e) {}

    const generator = new FaustPolyDspGenerator();
    faustNode = await generator.createNode(
      audioContext,
      voices,
      "FaustPolyDSP",
      { module: faustDsp.dspModule, json: JSON.stringify(faustDsp.dspMeta) },
      faustDsp.mixerModule,
      faustDsp.effectModule
        ? {
            module: faustDsp.effectModule,
            json: JSON.stringify(faustDsp.effectMeta),
          }
        : undefined
    );
  } else {
    const generator = new FaustMonoDspGenerator();
    faustNode = await generator.createNode(audioContext, "FaustMonoDSP", {
      module: faustDsp.dspModule,
      json: JSON.stringify(faustDsp.dspMeta),
    });
  }

  // Return an object with the Faust audio node and the DSP metadata
  return { faustNode, dspMeta };
};

export default async function create${name}Node(audioContext) {
  return createFaustNode(audioContext, "${res?.wasm}");
}`;
}

export async function faustLoaderWasmImpl(
  emitFile: (name: string, source: string | Uint8Array, contentType: string) => string,
  name: string,
  content: string,
): Promise<OutPackage> {
  if (name == null) {
    throw new Error("undefined or null name");
  }

  // initialize the libfaust wasm
  const faustModule = await instantiateFaustModuleFromFile(FAUST_MODULE_PATH);
  const libFaust = new LibFaust(faustModule);

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

  return { wasm: wasmOut, json: jsonOut };
}
