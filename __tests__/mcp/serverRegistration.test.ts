// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import path from "node:path";

const serverSource = readFileSync(
  path.join(process.cwd(), "src/mcp/server.ts"),
  "utf8",
);

describe("Test Scenario MCP server registration", () => {
  it("registers exactly the four approved Test Scenario tuples", () => {
    const registeredTools = [
      ...serverSource.matchAll(
        /server\.(?:tool|registerTool)\(\s*(?:\.\.\.)?(\w+)/g,
      ),
    ].map((match) => match[1]);

    expect(registeredTools).toEqual(
      expect.arrayContaining([
        "listTestScenarios",
        "getTestScenario",
        "updateTestScenario",
        "deleteTestScenario",
      ]),
    );
    expect(registeredTools).not.toContain("createTestScenario");
  });

  it("does not mention a scenario creation tool or creator input", () => {
    expect(serverSource).not.toContain("create-test-scenario");
    expect(serverSource).not.toContain("createdById");
  });
});
