import { defineConfig } from "vite";
import reactRefresh from "@vitejs/plugin-react-refresh";
// import svgrPlugin from "vite-plugin-svgr";
import loaderPlugin from "@betit/rollup-plugin-webpack-loader";

// https://vitejs.dev/config/
export default defineConfig({
  // This changes the out put dir from dist to build
  // comment this out if that isn't relevant for your project
  build: {
    outDir: "build",
  },
  plugins: [
    reactRefresh(),
    // svgrPlugin({
    //   svgrOptions: {
    //     icon: true,
    //     // ...svgr options (https://react-svgr.com/docs/options/)
    //   },
    // }),
    // loaderPlugin({
    //   include: /\.ts$/,
    //   exclude: /\.d\.ts$/,
    //   use: [
    //     {
    //       loader: "ts-loader",
    //     },
    //   ],
    //   webpackOptions: {
    //     resolve: {
    //       symlinks: true,
    //       extensions: [".tsx", ".ts", ".js"],
    //     },
    //   },
    // }),
  ],
});
