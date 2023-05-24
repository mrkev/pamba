process.env.BABEL_ENV = "development";

module.exports = {
  extends: ["react-app", "react-app/jest"],
  parserOptions: {
    project: "./tsconfig.json",
  },
  // parser: "@typescript-eslint/parser",
  // plugins: ["@typescript-eslint"],
  rules: {
    "no-useless-concat": "off",
    // Require Promise-like statements to be handled appropriately.
    "@typescript-eslint/no-floating-promises": "error",
    // Disallow conditionals where the type is always truthy or always falsy.
    // seems to raise false positives?
    // "@typescript-eslint/no-unnecessary-condition": "warn",
    // No unused vars, except when name starts with "_"
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
  },

  globals: {
    Atomics: "readonly",
    SharedArrayBuffer: "readonly",
  },
};
