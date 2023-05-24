import type { PluginOption, ResolvedConfig } from "vite";
import type { TransformPluginContext, PluginContext } from "rollup";
import * as tmp from "tmp-promise";
import type { DirectoryResult } from "tmp-promise";
import * as path from "path";
import * as fs from "fs-extra";
import { promisify } from "util";
import { exec as execCallback } from "child_process";
const exec = promisify(execCallback);

const isDsp = (id: string) => /\.(dsp)$/.test(id);

export const createBasePath = (base?: string) => {
  return (base?.replace(/\/$/, "") || "") + "/@faustloader/";
};

export function faustLoder(): PluginOption {
  let config: ResolvedConfig | null = null;
  let workDir: DirectoryResult | null = null;
  let virtPath: string | null = null;
  // Essentially a virtual file system for when running in dev. path -> source, content type
  // ie, /@faustloader/Panner.wasm -> { source: '...', "application/wasm" }
  const virtFiles = new Map<string, { source: string | Uint8Array; contentType: string }>();

  // id -> paths for built assets.
  // If on dev-server, path looks like /@faustloader/Panner.wasm
  // If building, path looks like /assets/Panner-2lhy239.wasm (template looks like, " __VITE_ASSET__${fileHandle}__")
  const outFiles = new Map<
    string,
    {
      wasm: string;
      processor: string;
    }
  >();

  return {
    name: "faust-lodaer-plugin",

    configResolved(resolvedConfig: ResolvedConfig) {
      // store the resolved config
      config = resolvedConfig;
      // ie, /@faustloader/foo/bar/base/path/
      virtPath = createBasePath(config.base);
      config.logger.info("[config] " + virtPath);
    },

    async transform(_src, id) {
      if (!isDsp(id)) {
        return;
      }

      // config?.logger.info("[trans] " + id);
      const name = path.parse(id).name;
      // const dspPath = this.meta.watchMode ? virtPath : "";
      const dspPath = "";

      const res = outFiles.get(id);

      return {
        map: null,
        code: `
        import loadProcessor from "faust-loader-vite/dist/loadProcessor";

        console.log("how about  ${res?.wasm} and  ${res?.processor}")

        export default function create${name}Node(context) {
          return loadProcessor(context, "${name}", "${dspPath}", "${res?.wasm}", "${res?.processor}");
        }
      `,
      };
    },

    async load(id: string) {
      if (!isDsp(id)) {
        return;
      }

      if (workDir == null) {
        workDir = await tmp.dir();
        const faust2wasmPath = path.resolve(__dirname, "./faust2appls");
        await fs.copy(faust2wasmPath, workDir.path);
        config.logger.info("[load] Created workdir at: " + workDir.path);
      }

      const emitFile = (name: string, source: string | Uint8Array, contentType?: string): string => {
        if (this.meta.watchMode) {
          const virtualFilePath = virtPath + name;

          // const id = generateImageID(srcURL, config)
          virtFiles.set(virtualFilePath, { source, contentType });
          // metadata.src = basePath + id
          config.logger.info(`[load] watch emit: ${virtualFilePath}`);
          return virtualFilePath;
        } else {
          const fileHandle = this.emitFile({
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
      const src = await fs.readFile(id, { encoding: "utf-8" });
      const files = await faustLoader(emitFile, name, src, workDir);

      // If building, store the paths to the built files

      outFiles.set(id, files);

      config.logger.info("[load] " + id);
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.indexOf("Panner") > -1) {
          config.logger.info(`[server] requesting ${req.url}`);
        }

        if (req.url?.startsWith(virtPath)) {
          // const [, id] = req.url.split(virtPath);
          // config.logger.info(`[server] HIT: ${req.url} ${id}`);

          const file = virtFiles.get(req.url);

          if (!file) {
            throw new Error(
              `vite-faust-loader cannot find image with url "${req.url}" this is likely an internal error`
            );
          }

          config.logger.info(`[server] SENDING: ${req.url}, ${file.source.length}`);

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
    },
  };
}

async function faustLoader(
  emitFile: (name: string, source: string | Uint8Array, contentType?: string) => string,
  name: string,
  content: string,
  workDir: DirectoryResult
): Promise<{ wasm: string; processor: string }> {
  if (name == null) {
    throw new Error("undefined or null name");
  }

  // const dspName = interpolateName(this, "[name]", { content, context });
  const dspName = name;
  const dspPath = path.resolve(workDir.path, dspName);

  await fs.writeFile(dspPath, content);
  const { stderr } = await exec(`./faust2wasm -worklet ${dspPath}`, {
    cwd: workDir.path,
  });
  if (stderr) throw new Error(stderr);

  const wasmName = name + ".wasm";
  const wasmPath = path.resolve(workDir.path, wasmName);
  const wasmContent = await fs.readFile(wasmPath);
  // TODO: this method should accept a buffer
  // PR: https://github.com/webpack/webpack/pull/13577
  const wasmOut = emitFile(wasmName, wasmContent, "application/wasm");

  const processorName = `${name}-processor.js`;
  const processorPath = path.resolve(workDir.path, processorName);
  const processorContent = await fs.readFile(processorPath, {
    encoding: "utf8",
  });

  const cleanedProcessorContent = processorContent.replace(/console\.log\(this\);/, "");
  const processorOut = emitFile(processorName, cleanedProcessorContent, "application/javascript");

  return { wasm: wasmOut, processor: processorOut };
}
