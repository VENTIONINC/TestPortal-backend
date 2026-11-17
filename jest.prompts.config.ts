import baseConfig from "./jest.config";
import path from "node:path";
import type { JestConfigWithTsJest } from "ts-jest";

const evalRoot = process.env.TESTPORTAL_AI_EVAL_ROOT;
if (!evalRoot) {
  throw new Error(
    "Set TESTPORTAL_AI_EVAL_ROOT to the private TestPortal-testing/ai-evals/backend/prompts directory.",
  );
}

const externalEvalConfig: JestConfigWithTsJest = {
  ...baseConfig,
  roots: ["<rootDir>", evalRoot],
  modulePaths: [path.resolve("node_modules")],
  testPathIgnorePatterns: ["/dist/"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        // Jest resolves dependencies from the backend for the external eval files.
        diagnostics: false,
        tsconfig: path.resolve("tsconfig.json"),
      },
    ],
  },
};

const config: JestConfigWithTsJest = {
  projects: [
    {
      ...externalEvalConfig,
      displayName: "error-formatter",
      testMatch: [`${evalRoot}/error-formatter/*.test.ts`],
    },
    {
      ...externalEvalConfig,
      displayName: "stored-results-analysis",
      testMatch: [
        `${evalRoot}/stored-results-analysis/**/?(*.)test.ts`,
      ],
    },
    {
      ...externalEvalConfig,
      displayName: "error-solution",
      testMatch: [`${evalRoot}/error-solution/**/?(*.)test.ts`],
    },
    {
      ...externalEvalConfig,
      displayName: "insights-evaluation",
      testMatch: [`${evalRoot}/insights/**/?(*.)test.ts`],
    },
    {
      ...externalEvalConfig,
      displayName: "evaluation-framework",
      testMatch: [`${evalRoot}/evaluation-framework.test.ts`],
    },
  ],
};

export default config;
