// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createTestScenarioSchema } from "@/mcp/schemas/testScenarioSchemas";

const serverSource = readFileSync(
  path.join(process.cwd(), "src/mcp/server.ts"),
  "utf8",
);

describe("Test Scenario MCP server registration", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("registers all eight non-creation scenario tools", async () => {
    const { registerTestScenarioTools } = await import("@/mcp/server");
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "registration-test", version: "1.0.0" });
    const server = new McpServer({
      name: "registration-test",
      version: "1.0.0",
    });
    registerTestScenarioTools(server);

    try {
      await Promise.all([
        server.connect(serverTransport),
        client.connect(clientTransport),
      ]);
      const catalog = await client.listTools();
      expect(catalog.tools.map(({ name }) => name).sort()).toEqual([
        "append-test-scenario-step",
        "delete-test-scenario",
        "delete-test-scenario-step",
        "get-test-scenario",
        "list-test-scenarios",
        "reorder-test-scenario-steps",
        "update-test-scenario",
        "update-test-scenario-step",
      ]);
    } finally {
      await Promise.all([client.close(), server.close()]);
    }
  });

  it("binds creation to the authenticated session owner and rejects caller creator input", () => {
    expect(serverSource).toMatch(/const reviewedById = req\.mcpUserId/);
    expect(serverSource).toMatch(
      /const createTestScenario = createTestScenarioTool\(reviewedById\)/,
    );
    expect(serverSource).not.toContain("createdById");
    const input = {
      projectId: "11111111-1111-4111-8111-111111111111",
      title: "Case",
    };
    expect(createTestScenarioSchema.safeParse(input).success).toBe(true);
    expect(
      createTestScenarioSchema.safeParse({
        ...input,
        createdById: "22222222-2222-4222-8222-222222222222",
      }).success,
    ).toBe(false);
  });
});
