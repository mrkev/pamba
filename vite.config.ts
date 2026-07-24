/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import faustLoader from "vite-plugin-faust";
import svgrPlugin from "vite-plugin-svgr";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  test: {
    // root: "src",
    environment: "jsdom",
    setupFiles: ["./src/lib/__tests__/setup.ts"],
    // packages/* are git submodules with their own (jest-based) test setups.
    exclude: [...configDefaults.exclude, "packages/**"],
  },
  plugins: [react(), tailwindcss(), svgrPlugin(), faustLoader()],
  resolve: {
    // Linked sibling packages (webgpu-waveform-react, structured-state, …) resolve
    // their bare `react`/`react-dom` imports relative to their own real location,
    // which pulls in a *second* copy of React from the sibling repo's node_modules.
    // Two React copies means the hook dispatcher is null in the copy those packages
    // use → "Cannot read properties of null (reading 'useRef')" in production.
    // dedupe forces every react/react-dom import back to pamba's single copy.
    dedupe: ["react", "react-dom"],
  },
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
