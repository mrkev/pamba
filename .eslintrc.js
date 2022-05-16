module.exports = {
  extends: ["react-app", "react-app/jest"],
  rules: {
    "no-useless-concat": "off",
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
