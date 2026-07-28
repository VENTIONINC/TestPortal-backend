import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/src/test-utils/testEnv.ts"],
  extensionsToTreatAsEsm: [".ts"],
  testPathIgnorePatterns: ["/dist/", "/__prompts-tests__/"],
  moduleNameMapper: {
    "^@/prisma/(.*)$": "<rootDir>/prisma/$1",
    "^@/root/path.config.js$": "<rootDir>/__mocks__/path.config.ts",
    "^@/root/(.*)$": "<rootDir>/$1",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

export default config;
