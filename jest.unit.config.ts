// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0
import baseConfig from "./jest.config";
import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
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

export default config;
