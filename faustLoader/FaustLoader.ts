import { readFile } from "fs/promises";
import * as path from "path";
import * as tmp from "tmp-promise";
import { DirectoryResult } from "tmp-promise";
import type { ResolvedConfig, Rollup } from "vite";
import { faustLoaderImpl } from "./faustLoder";
import { PluginContext } from "rollup";

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

export class FaustLoader {
  public name: "faust-lodaer-plugin";

  private resConfig: ResolvedConfig | null = null;
  private workDir: Promise<DirectoryResult> | null = null;
  private virtPath: string | null = null;

  // Essentially a virtual file system for when running in dev. path -> source, content type
  // ie, /@faustloader/Panner.wasm -> { source: '...', "application/wasm" }
  private virtFiles = new Map<string, { source: string | Uint8Array; contentType: string }>();

  // id -> paths for built assets.
  // If on dev-server, path looks like /@faustloader/Panner.wasm
  // If building, path looks like /assets/Panner-2lhy239.wasm (template looks like, " __VITE_ASSET__${fileHandle}__")
  private outFiles = new Map<
    string,
    {
      wasm: string;
      json: string;
    }
  >();

  configResolved(resolvedConfig: ResolvedConfig) {
    // store the resolved config
    this.resConfig = resolvedConfig;
    // ie, /@faustloader/foo/bar/base/path/
    this.virtPath = createBasePath(this.resConfig.base);
    this.resConfig.logger.info("[config] " + this.virtPath);
  }

  async transform(_src, id) {
    if (!isDsp(id)) {
      return;
    }

    // config?.logger.info("[trans] " + id);
    const name = path.parse(id).name;
    // const dspPath = this.meta.watchMode ? virtPath : "";
    const dspPath = "";

    const res = this.outFiles.get(id);

    // TODO THIS
    return {
      map: null,
      code: `
      // import loadProcessor from "faust-loader-vite/dist/loadProcessor";
      // import { FaustMonoDspGenerator, FaustPolyDspGenerator } from "@grame/faustwasm";

      // console.log("how about  ${res?.wasm} and  ${res?.json}")
      ${createFaustNodeCode}

      export default async function create${name}Node(audioContext) {
        return createFaustNode(audioContext, "${res?.wasm}");
      }
    `,
    };
  }

  async load(id: string, context: PluginContext) {
    if (!isDsp(id)) {
      return;
    }

    if (this.workDir == null) {
      this.workDir = tmp.dir();

      const workDir = await this.workDir;
      // const faust2wasmPath = path.resolve(__dirname, "./faust2appls");
      // await fs.copy(faust2wasmPath, workDir.path);
      this.resConfig.logger.info("\n[load] Created workdir at: " + workDir.path);
    }

    // console.log(this);
    // process.exit(0);

    const emitFile = (name: string, source: string | Uint8Array, contentType?: string): string => {
      if (context.meta.watchMode) {
        const virtualFilePath = this.virtPath + name;

        // const id = generateImageID(srcURL, config)
        this.virtFiles.set(virtualFilePath, { source, contentType });
        // metadata.src = basePath + id
        this.resConfig.logger.info(`[load] watch emit: ${virtualFilePath}`);
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
    const files = await faustLoaderImpl(emitFile, name, src, await this.workDir);

    // If building, store the paths to the built files

    this.outFiles.set(id, files);

    this.resConfig.logger.info("[load] " + id);
  }

  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url?.indexOf("Panner") > -1) {
        this.resConfig.logger.info(`[server] requesting ${req.url}`);
      }

      if (req.url?.startsWith(this.virtPath)) {
        // const [, id] = req.url.split(virtPath);
        // config.logger.info(`[server] HIT: ${req.url} ${id}`);

        const file = this.virtFiles.get(req.url);

        if (!file) {
          throw new Error(`vite-faust-loader cannot find image with url "${req.url}" this is likely an internal error`);
        }

        this.resConfig.logger.info(`[server] SENDING: ${req.url}, ${file.source.length}`);

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

const createFaustNodeCode = `
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
    const { FaustMonoDspGenerator, FaustPolyDspGenerator } = await import("@grame/faustwasm");
    const dspPath = wasmPath.replace(/\.wasm$/i, '');

    // Load DSP metadata from JSON
    /** @type {FaustDspMeta} */
    const dspMeta = await (await fetch(\`\${dspPath}.json\`)).json();

    // Compile the DSP module from WebAssembly binary data
    const dspModule = await WebAssembly.compileStreaming(await fetch(\`\${dspPath}.wasm\`));

    // Create an object representing Faust DSP with metadata and module
    /** @type {FaustDspDistribution} */
    const faustDsp = { dspMeta, dspModule };

    /** @type {FaustAudioWorkletNode} */
    let faustNode;

    // Create either a polyphonic or monophonic Faust audio node based on the number of voices
    if (voices > 0) {

        // Try to load optional mixer and effect modules
        try {
            faustDsp.mixerModule = await WebAssembly.compileStreaming(await fetch("./mixerModule.wasm"));
            faustDsp.effectMeta = await (await fetch(\`\${dspPath}_effect.json\`)).json();
            faustDsp.effectModule = await WebAssembly.compileStreaming(await fetch(\`\${dspPath}_effect.wasm\`));
        } catch (e) { }

        const generator = new FaustPolyDspGenerator();
        faustNode = await generator.createNode(
            audioContext,
            voices,
            "FaustPolyDSP",
            { module: faustDsp.dspModule, json: JSON.stringify(faustDsp.dspMeta) },
            faustDsp.mixerModule,
            faustDsp.effectModule ? { module: faustDsp.effectModule, json: JSON.stringify(faustDsp.effectMeta) } : undefined
        );
    } else {
        const generator = new FaustMonoDspGenerator();
        faustNode = await generator.createNode(
            audioContext,
            "FaustMonoDSP",
            { module: faustDsp.dspModule, json: JSON.stringify(faustDsp.dspMeta) }
        );
    }

    // Return an object with the Faust audio node and the DSP metadata
    return { faustNode, dspMeta };
}
`;
