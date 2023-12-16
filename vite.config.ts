/// <reference types="vitest" />

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgrPlugin from "vite-plugin-svgr";
import viteTsconfigPaths from "vite-tsconfig-paths";
import { faustLoder } from "./faustLoader/faustLoder";
import * as path from "path";

// To polyfill Buffer
import RollupPluginNodePolyfill from "rollup-plugin-node-polyfills";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";

// https://vitejs.dev/config/
export default defineConfig({
  test: {
    root: "src",
    environment: "jsdom",
  },
  build: {
    minify: "terser",
    outDir: "./build",
    rollupOptions: {
      plugins: [RollupPluginNodePolyfill()],
      // input: {
      //   index: path.resolve(__dirname, "index.html"),
      //   // path.resolve(__dirname, "src", "wam", "pianorollme", "PianoRollProcessor.ts"),
      //   foo: path.resolve(__dirname, "src", "wam", "pianorollme", "PianoRollNode.tsx"),
      // },
    },
  },
  esbuild: {
    // target: "es2020",
    // banner: "console.log('hi');",
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  plugins: [react(), viteTsconfigPaths(), svgrPlugin(), faustLoder()],
  optimizeDeps: {
    esbuildOptions: {
      // define: { global: "globalThis" },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true,
          // process: true,
        }),
        NodeModulesPolyfillPlugin(),
      ],
    },
  },
});
