/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import faustLoader from "vite-plugin-faust";
import svgrPlugin from "vite-plugin-svgr";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  test: {
    // root: "src",
    environment: "jsdom",
  },
  plugins: [react(), tailwindcss(), svgrPlugin(), faustLoader()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  build: {
    minify: false,
    outDir: "./build",
    rollupOptions: {
      // plugins: [RollupPluginNodePolyfill()],
      // input: {
      //   index: path.resolve(__dirname, "index.html"),
      //   // path.resolve(__dirname, "src", "wam", "pianorollme", "PianoRollProcessor.ts"),
      //   foo: path.resolve(__dirname, "src", "wam", "pianorollme", "PianoRollNode.tsx"),
      // },
    },
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  optimizeDeps: {
    // Only scan the app entry. The `packages/*` git submodules ship typedoc HTML
    // that Vite 8's Rolldown-based dep scanner would otherwise try to crawl.
    entries: ["index.html"],
  },
});
