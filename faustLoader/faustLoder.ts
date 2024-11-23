import type { PluginOption, ResolvedConfig } from "vite";
import { FaustLoader } from "./FaustLoader";

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
