import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier/flat";
import globals from "globals";

const wxtGlobals = {
  defineBackground: "readonly",
  defineContentScript: "readonly"
};

export default defineConfig([
  globalIgnores([
    ".output/**",
    ".wxt/**",
    "**/.output/**",
    "**/.wxt/**",
    "coverage/**",
    "dist/**",
    "**/coverage/**",
    "**/dist/**",
    "node_modules/**"
  ]),

  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...globals.browser,
        ...globals.es2022,
        ...globals.webextensions,
        ...wxtGlobals
      },
      sourceType: "module"
    }
  },

  js.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_"
        }
      ],
      "no-console": "error",
      "no-undef": "off"
    }
  },

  {
    files: ["**/*.test.ts", "**/*.test.tsx", "*.config.*"],
    rules: {
      "no-console": "off"
    }
  },

  {
    files: ["**/scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },

  prettier
]);
