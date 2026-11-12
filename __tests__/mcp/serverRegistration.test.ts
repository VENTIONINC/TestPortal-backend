// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import path from "node:path";
import { createTestScenarioSchema } from "@/mcp/schemas/testScenarioSchemas";

const serverSource = readFileSync(
  path.join(process.cwd(), "src/mcp/server.ts"),
  "utf8",
);

describe("Test Scenario MCP server registration", () => {
  it("registers scenario creation alongside list, detail, update, and delete", () => {
    const registeredTools = [
      ...serverSource.matchAll(
        /server\.(?:tool|registerTool)\(\s*(?:\.\.\.)?(\w+)/g,
      ),
    ].map((match) => match[1]);

    expect(registeredTools).toEqual(
      expect.arrayContaining([
        "createTestScenario",
        "listTestScenarios",
        "getTestScenario",
        "updateTestScenario",
        "deleteTestScenario",
      ]),
    );
  });

  it("binds creation to the authenticated session owner and rejects caller creator input", () => {
    expect(serverSource).toMatch(/const reviewedById = req\.mcpUserId/);
    expect(serverSource).toMatch(/const createTestScenario = createTestScenarioTool\(reviewedById\)/);
    expect(serverSource).not.toContain("createdById");
    const input = { projectId: "11111111-1111-4111-8111-111111111111", title: "Case" };
    expect(createTestScenarioSchema.safeParse(input).success).toBe(true);
    expect(createTestScenarioSchema.safeParse({ ...input, createdById: "22222222-2222-4222-8222-222222222222" }).success).toBe(false);
  });
});
