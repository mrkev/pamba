import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import { FlatCompat } from "@eslint/eslintrc";
import eslint from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: eslint.configs.recommended,
  allConfig: eslint.configs.all,
});

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "vite.config.mts",
      "faustLoader/**/*",
      "src/midi/**/*",
      "public",
      "scripts",
      "packages",
      "build",
      "src/wam/pianorollme",
    ],
  },
  ...fixupConfigRules(compat.extends("plugin:react/recommended", "plugin:react-hooks/recommended")),
  {
    plugins: {
      react: fixupPluginRules(react),
      "@typescript-eslint": typescriptEslint,
      "react-hooks": fixupPluginRules(reactHooks),
    },

    languageOptions: {
      globals: {
        Atomics: "readonly",
        SharedArrayBuffer: "readonly",
      },

      ecmaVersion: "latest",
      sourceType: "module",

      parserOptions: {
        project: "./tsconfig.json",
      },
    },

    settings: {
      react: {
        version: "detect",
      },
    },

    rules: {
      "no-useless-concat": "off",
      "no-undef": "off",
      "no-fallthrough": "off",
      "no-case-declarations": "off",
      // "for-direction": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      "@typescript-eslint/no-unnecessary-type-constraint": "off",
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
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "spaced-comment": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react/react-in-jsx-scope": "off",
      "react/no-unescaped-entities": "off",
      "react/prop-types": "off",
    },
  },
);
