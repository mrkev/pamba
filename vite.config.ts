import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import viteTsconfigPaths from "vite-tsconfig-paths";
import svgrPlugin from "vite-plugin-svgr";
import Inspect from "vite-plugin-inspect";
import { faustLoder } from "./faustLoader/faustLoder";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: "./build",
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  plugins: [
    // Inspect({
    //   build: true,
    //   outputDir: ".vite-inspect",
    // }),
    react(),
    viteTsconfigPaths(),
    svgrPlugin(),
    faustLoder(),
  ],
});
