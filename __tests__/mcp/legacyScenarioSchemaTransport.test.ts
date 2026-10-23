// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const mockListTestScenarios = jest.fn();
const mockGetTestScenario = jest.fn();
const mockUpdateTestScenario = jest.fn();
const mockDeleteTestScenario = jest.fn();

jest.mock("@/handlers/mcpTestScenarioHandler", () => ({
  mcpTestScenarioHandler: {
    listTestScenarios: mockListTestScenarios,
    getTestScenario: mockGetTestScenario,
    updateTestScenario: mockUpdateTestScenario,
    deleteTestScenario: mockDeleteTestScenario,
  },
}));

import { registerLegacyTestScenarioTools } from "@/mcp/server";

const projectId = "11111111-1111-1111-1111-111111111111";
const scenarioId = "22222222-2222-2222-2222-222222222222";

describe("legacy Test Scenario MCP schema validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps strict and refined schemas active at the transport boundary", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "legacy-schema-test", version: "1.0.0" });
    const server = new McpServer({
      name: "legacy-schema-test",
      version: "1.0.0",
    });
    registerLegacyTestScenarioTools(server);

    try {
      await Promise.all([
        server.connect(serverTransport),
        client.connect(clientTransport),
      ]);

      const unknownFieldResponse = await client.callTool({
        name: "update-test-scenario",
        arguments: {
          scenarioId,
          projectId,
          title: "A valid edit",
          unexpected: true,
        },
      });
      expect(unknownFieldResponse.isError).toBe(true);
      expect(mockUpdateTestScenario).not.toHaveBeenCalled();

      const refinementResponse = await client.callTool({
        name: "update-test-scenario",
        arguments: { scenarioId, projectId },
      });
      expect(refinementResponse.isError).toBe(true);
      expect(mockUpdateTestScenario).not.toHaveBeenCalled();
    } finally {
      await Promise.all([client.close(), server.close()]);
    }
  });
});
