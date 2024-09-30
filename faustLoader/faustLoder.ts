import faust2wasmFiles from "@grame/faustwasm/src/faust2wasmFiles";
import { readFile, writeFile } from "fs/promises";
import * as path from "path";
import type { DirectoryResult } from "tmp-promise";
import type { PluginOption, ResolvedConfig } from "vite";
import { FaustLoader } from "./FaustLoader";

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
