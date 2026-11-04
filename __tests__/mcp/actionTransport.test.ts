// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createActionCatalog } from "@/mcp/actionCatalog";

describe("public action transport", () => {
  it("advertises two bounded tools and rejects legacy names", async () => {
    jest.useFakeTimers();
    const { registerActionTools } = await import("@/mcp/server");
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "client", version: "1" });
    const server = new McpServer({ name: "server", version: "1" });
    const actions = createActionCatalog("actor");
    actions.set("testportal-synthetic", [
      "testportal-synthetic",
      "Synthetic",
      {},
      async () => ({ content: [] }),
    ]);
    registerActionTools(server, "actor", actions);
    try {
      await Promise.all([
        server.connect(serverTransport),
        client.connect(clientTransport),
      ]);
      const catalog = await client.listTools();
      expect(catalog.tools.map(({ name }) => name).sort()).toEqual([
        "testportal-execute-action",
        "testportal-find-action",
      ]);
      expect(JSON.stringify(catalog)).not.toContain("testportal-get-results");
      expect(JSON.stringify(catalog)).not.toContain("testportal-synthetic");
      expect(
        catalog.tools.find(({ name }) => name === "testportal-find-action")
          ?.annotations?.readOnlyHint,
      ).toBe(true);
      expect(
        catalog.tools.find(({ name }) => name === "testportal-execute-action")
          ?.annotations,
      ).toMatchObject({
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
      });
      for (const name of ["testportal-check-status", "check-status"]) {
        const result = await client.callTool({ name, arguments: {} });
        expect(result.isError).toBe(true);
      }
      const result = await client.callTool({
        name: "testportal-execute-action",
        arguments: { actionId: "testportal-check-status", arguments: {} },
      });
      expect(result.isError).not.toBe(true);
      for (const args of [
        { query: "x", actionId: "y" },
        { limit: 1 },
        { query: "x", extra: true },
      ]) {
        const rejected = await client.callTool({
          name: "testportal-find-action",
          arguments: args,
        });
        expect(rejected.isError).toBe(true);
      }
    } finally {
      await Promise.all([client.close(), server.close()]);
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });
});
