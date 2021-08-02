const {
  override,
  addDecoratorsLegacy,
  addBabelPlugin,
  addBabelPreset,
} = require("customize-cra");

module.exports = override(
  addDecoratorsLegacy(),
  addBabelPlugin("babel-plugin-parameter-decorator"),
  addBabelPlugin("babel-plugin-transform-typescript-metadata"),
  addBabelPreset(["@babel/preset-typescript"])
);
