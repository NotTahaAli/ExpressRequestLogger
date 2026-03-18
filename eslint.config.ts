import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.node } },
  tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    rules: {
      // Enforce .js extension on all relative imports (required for Node ESM)
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportDeclaration[source.value=/^\\./]:not([source.value=/\\.js$/]):not([source.value=/\\.mjs$/]):not([source.value=/\\.cjs$/])",
          message: "Relative imports must include a .js extension (e.g. './foo.js').",
        },
        {
          selector: "ExportAllDeclaration[source.value=/^\\./]:not([source.value=/\\.js$/]):not([source.value=/\\.mjs$/]):not([source.value=/\\.cjs$/])",
          message: "Relative re-exports must include a .js extension (e.g. './foo.js').",
        },
        {
          selector: "ExportNamedDeclaration[source.value=/^\\./]:not([source.value=/\\.js$/]):not([source.value=/\\.mjs$/]):not([source.value=/\\.cjs$/])",
          message: "Relative re-exports must include a .js extension (e.g. './foo.js').",
        },
      ],
    },
  },
]);