import js from "@eslint/js";
import globals from "globals";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";

export default [
  js.configs.recommended,

  // JavaScript files configuration
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // TypeScript files configuration
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.json",
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslint,
    },
    rules: {
      // TypeScript-specific rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/explicit-function-return-type": "off", // Too strict for now
      "@typescript-eslint/explicit-module-boundary-types": "off", // Too strict for now
      "@typescript-eslint/no-inferrable-types": "warn",
      "@typescript-eslint/prefer-as-const": "error",
      "@typescript-eslint/no-empty-function": "warn",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "error",

      // Disable base ESLint rules that are covered by TypeScript equivalents
      "no-unused-vars": "off",
      "no-undef": "off", // TypeScript handles this
      "no-redeclare": "off",
      "@typescript-eslint/no-redeclare": "error",

      // Standard ESLint rules that work well with TypeScript
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-template": "error",
    },
  },

  // Override for configuration files that aren't part of the TS project
  {
    files: ["jest.config.ts"],
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
  },

  // Global ignores
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "backup-js-files/**",
      "*.d.ts",
      "jest.config.ts",
    ],
  },
];
