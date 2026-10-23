// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerLegacyTestScenarioTools } from "@/mcp/server";

const serverSource = readFileSync(
  path.join(process.cwd(), "src/mcp/server.ts"),
  "utf8",
);

describe("Test Scenario MCP server registration", () => {
  it("registers exactly the four approved Test Scenario tools", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "registration-test", version: "1.0.0" });
    const server = new McpServer({
      name: "registration-test",
      version: "1.0.0",
    });
    registerLegacyTestScenarioTools(server);

    try {
      await Promise.all([
        server.connect(serverTransport),
        client.connect(clientTransport),
      ]);
      const catalog = await client.listTools();
      expect(catalog.tools.map(({ name }) => name).sort()).toEqual([
        "delete-test-scenario",
        "get-test-scenario",
        "list-test-scenarios",
        "update-test-scenario",
      ]);
    } finally {
      await Promise.all([client.close(), server.close()]);
    }
  });

  it("does not mention a scenario creation tool or creator input", () => {
    expect(serverSource).not.toContain("create-test-scenario");
    expect(serverSource).not.toContain("createdById");
  });
});
