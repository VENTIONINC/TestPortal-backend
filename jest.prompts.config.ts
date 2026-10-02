import baseConfig from "./jest.config";
import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  projects: [
    {
      ...baseConfig,
      setupFiles: [],
      testPathIgnorePatterns: ["/dist/"],
      displayName: "stored-results-analysis",
      testMatch: [
        "<rootDir>/__prompts-tests__/stored-results-analysis/**/?(*.)test.ts",
      ],
    },
    {
      ...baseConfig,
      setupFiles: [],
      testPathIgnorePatterns: ["/dist/"],
      displayName: "error-solution",
      testMatch: ["<rootDir>/__prompts-tests__/error-solution/**/?(*.)test.ts"],
    },
  ],
};

export default config;
