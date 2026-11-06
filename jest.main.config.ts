// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0
import baseConfig from "./jest.config";
import type { JestConfigWithTsJest } from "ts-jest";

const contractTestPaths = [
  "<rootDir>/__tests__/lib/openapi/**/*.test.ts",
  "<rootDir>/__tests__/schemas/**/*.test.ts",
  "<rootDir>/__tests__/mcp/**/*Schemas.test.ts",
  "<rootDir>/__tests__/prisma/*Migration.test.ts",
];

const integrationTestPaths = [
  "<rootDir>/__tests__/routes/**/*.test.ts",
  "<rootDir>/__tests__/mcp/mcpTransport.test.ts",
  "<rootDir>/__tests__/mcp/serverRegistration.test.ts",
  "<rootDir>/__tests__/mcp/sessionAuthorization.test.ts",
  "<rootDir>/__tests__/mcp/testScenarioMcpWorkflow.test.ts",
  "<rootDir>/__tests__/test-scenarios/testScenarioIntegrationWorkflow.test.ts",
  "<rootDir>/__tests__/**/*PostgresIntegration.test.ts",
];

const unitConfig: JestConfigWithTsJest = {
  ...baseConfig,
  displayName: "unit",
  testPathIgnorePatterns: [
    ...(baseConfig.testPathIgnorePatterns ?? []),
    "/__tests__/lib/openapi/",
    "/__tests__/schemas/",
    "/__tests__/mcp/.*Schemas\\.test\\.ts$",
    "/__tests__/prisma/.*Migration\\.test\\.ts$",
    "/__tests__/routes/",
    "/__tests__/mcp/(mcpTransport|serverRegistration|sessionAuthorization|testScenarioMcpWorkflow)\\.test\\.ts$",
    "/__tests__/test-scenarios/testScenarioIntegrationWorkflow\\.test\\.ts$",
    "/__tests__/.*PostgresIntegration\\.test\\.ts$",
    "/__tests__/e2e/",
  ],
};

const contractConfig: JestConfigWithTsJest = {
  ...baseConfig,
  displayName: "contract",
  testMatch: contractTestPaths,
};

const integrationConfig: JestConfigWithTsJest = {
  ...baseConfig,
  displayName: "integration",
  testMatch: integrationTestPaths,
};

const e2eConfig: JestConfigWithTsJest = {
  ...baseConfig,
  displayName: "e2e",
  testMatch: ["<rootDir>/__tests__/e2e/**/*.e2e.test.ts"],
};

const config: JestConfigWithTsJest = {
  projects: [unitConfig, contractConfig, integrationConfig, e2eConfig],
};

export default config;
