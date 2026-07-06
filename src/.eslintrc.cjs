/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,

  env: {
    browser: true,
    node: true,
    es2021: true,
  },

  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },

  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],

  plugins: ["react", "react-hooks"],

  settings: {
    react: {
      version: "detect",
    },
  },

  rules: {
    // React 17+ JSX transform (no need to import React)
    "react/react-in-jsx-scope": "off",

    // Allow flexible development patterns
    "no-unused-vars": "warn",
    "no-console": "off",

    // JSX formatting flexibility
    "react/prop-types": "off",

    // Hooks safety (keep ON)
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
  },
};
