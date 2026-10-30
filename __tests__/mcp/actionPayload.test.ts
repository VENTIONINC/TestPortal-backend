// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";
import { createActionCatalog } from "@/mcp/actionCatalog";
import { normalizeActionSchema } from "@/mcp/actionSchemas";

describe("discovery payload measurement", () => {
  it("compares the baseline registrations with the fixed public catalog", async () => {
    jest.useFakeTimers();
    const { registerActionTools } = await import("@/mcp/server");
    const legacy = new McpServer({ name: "legacy", version: "1" });
    const current = new McpServer({ name: "current", version: "1" });
    const actions = createActionCatalog("actor");
    for (const [name, description, schema] of actions.values()) {
      let inputSchema = normalizeActionSchema(schema);
      if (schema instanceof z.ZodType) {
        while (inputSchema instanceof z.ZodEffects)
          inputSchema = inputSchema.innerType();
        if (inputSchema instanceof z.ZodObject)
          inputSchema = inputSchema.strict();
      }
      legacy.registerTool(
        name,
        { description, inputSchema: inputSchema as z.AnyZodObject },
        async () => ({ content: [] }),
      );
    }
    registerActionTools(current, "actor");
    const clients = [
      new Client({ name: "legacy", version: "1" }),
      new Client({ name: "current", version: "1" }),
    ] as const;
    const servers = [legacy, current] as const;
    try {
      for (const [server, client] of [
        [legacy, clients[0]],
        [current, clients[1]],
      ] as const) {
        const [clientTransport, serverTransport] =
          InMemoryTransport.createLinkedPair();
        await Promise.all([
          server.connect(serverTransport),
          client.connect(clientTransport),
        ]);
      }
      const oldList = await clients[0].listTools();
      const newList = await clients[1].listTools();
      const baselineBytes = Buffer.byteLength(JSON.stringify(oldList));
      const currentBytes = Buffer.byteLength(JSON.stringify(newList));
      expect(oldList.tools).toHaveLength(40);
      expect(newList.tools).toHaveLength(2);
      expect(currentBytes).toBeLessThan(baselineBytes);
      const exact = await clients[1].callTool({
        name: "testportal-find-action",
        arguments: { actionId: "testportal-update-manual-test-run-step" },
      });
      const query = await clients[1].callTool({
        name: "testportal-find-action",
        arguments: { query: "manual step outcome", area: "tms", limit: 3 },
      });
      console.log(
        "TP39 catalog measurement",
        JSON.stringify({
          baselineBytes,
          currentBytes,
          exactBytes: Buffer.byteLength(JSON.stringify(exact)),
          queryBytes: Buffer.byteLength(JSON.stringify(query)),
        }),
      );
    } finally {
      await Promise.all([
        ...clients.map((client) => client.close()),
        ...servers.map((server) => server.close()),
      ]);
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });
});
