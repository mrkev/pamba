import { readFile, writeFile } from "fs/promises";
import * as path from "path";
import type { DirectoryResult } from "tmp-promise";
import type { PluginOption, ResolvedConfig } from "vite";
import { FaustLoader } from "./FaustLoader";

import faust2wasmFiles from "@grame/faustwasm/src/faust2wasmFiles";

export const createBasePath = (base?: string) => {
  return (base?.replace(/\/$/, "") || "") + "/@faustloader/";
};

export function faustLoader(): PluginOption {
  const loader = new FaustLoader();
  return {
    name: loader.name,
    configResolved(resolvedConfig: ResolvedConfig) {
      return loader.configResolved(resolvedConfig);
    },

    async transform(_src, id) {
      return loader.transform(_src, id);
    },

    async load(id: string) {
      return loader.load(id, this);
    },
    configureServer(server) {
      return loader.configureServer(server);
    },
  };
}

export async function faustLoaderImpl(
  emitFile: (name: string, source: string | Uint8Array, contentType?: string) => string,
  name: string,
  content: string,
  workDir: DirectoryResult,
): Promise<{ wasm: string; json: string }> {
  if (name == null) {
    throw new Error("undefined or null name");
  }

  const dspName = name;
  const dspPath = path.resolve(workDir.path, dspName);

  await writeFile(dspPath, content);
  await faust2wasmFiles(`${dspPath}`, `${workDir.path}`, []);

  const wasmName = name + ".wasm";
  const wasmPath = path.resolve(workDir.path, wasmName);
  const wasmContent = await readFile(wasmPath);
  // TODO: this method should accept a buffer
  // PR: https://github.com/webpack/webpack/pull/13577
  const wasmOut = emitFile(wasmName, wasmContent, "application/wasm");

  const jsonName = `${name}.json`;
  const jsonPath = path.resolve(workDir.path, jsonName);
  const jsonContent = await readFile(jsonPath, {
    encoding: "utf8",
  });

  const jsonOut = emitFile(jsonName, jsonContent, "application/json");

  return { wasm: wasmOut, json: jsonOut };
}
