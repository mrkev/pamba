process.env.BABEL_ENV = "development";

module.exports = {
  extends: ["plugin:react/recommended", "plugin:react-hooks/recommended"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: "./tsconfig.json",
  },
  ignorePatterns: ["vite.config.mts", "faustLoader/**", "src/midi/**"],
  parser: "@typescript-eslint/parser",
  plugins: [
    "react",
    "prettier",
    "@typescript-eslint",
    "react-hooks",
    //  "eslint-plugin-react-compiler"
  ],
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
    "@typescript-eslint/explicit-function-return-type": "off",
    "object-shorthand": "off",
    "@typescript-eslint/no-confusing-void-expression": "off",
    "@typescript-eslint/no-misused-promises": "off",
    "@typescript-eslint/return-await": "off",
    "no-useless-escape": "off",
    "@typescript-eslint/consistent-type-imports": "off",
    "@typescript-eslint/array-type": "off",
    "@typescript-eslint/lines-between-class-members": "off",
    "@typescript-eslint/consistent-generic-constructors": "off",
    "spaced-comment": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "react/react-in-jsx-scope": "off",
    "react/no-unescaped-entities": "off",
    // "react-compiler/react-compiler": 2,
  },
  globals: {
    Atomics: "readonly",
    SharedArrayBuffer: "readonly",
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};
