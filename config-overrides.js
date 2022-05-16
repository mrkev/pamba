const {
  override,
  addDecoratorsLegacy,
  addBabelPlugin,
  addBabelPreset,
  addWebpackModuleRule,
} = require("customize-cra");

module.exports = {
  devServer: function (configFunction) {
    return function (proxy, allowedHost) {
      const config = configFunction(proxy, allowedHost);
      config.headers = {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      };
      return config;
    };
  },

  webpack: override(
    // (config) => {
    //   const wasmExtensionRegExp = /\.wasm$/;

    //   config.resolve.extensions.push(".wasm");

    //   config.module.rules.forEach((rule) => {
    //     (rule.oneOf || []).forEach((oneOf) => {
    //       if (oneOf.loader && oneOf.loader.indexOf("file-loader") >= 0) {
    //         // make file-loader ignore WASM files
    //         oneOf.exclude.push(wasmExtensionRegExp);
    //       }
    //     });
    //   });

    //   // add a dedicated loader for WASM
    //   // config.module.rules.push({
    //   //   test: wasmExtensionRegExp,
    //   //   include: path.resolve(__dirname, "src"),
    //   //   use: [{ loader: require.resolve("wasm-loader"), options: {} }],
    //   // });

    //   return config;
    // },
    addWebpackModuleRule({
      test: /\.dsp$/,
      use: [
        {
          loader: "faust-loader",
          options: {
            outputPath: "processors", // Where the generated files will be placed relative to the output directory
            publicPath: "/processors", // Where the generated files will be served from
          },
        },
      ],
    })
    // addDecoratorsLegacy()
    // addBabelPlugin("babel-plugin-parameter-decorator"),
    // addBabelPlugin("babel-plugin-transform-typescript-metadata"),
    // addBabelPreset(["@babel/preset-typescript"])
  ),
};
