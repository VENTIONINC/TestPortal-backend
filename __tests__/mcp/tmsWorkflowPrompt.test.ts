// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Contract tests: these do not establish that a client follows the instructions.
describe("TMS workflow prompt registration", () => {
  it("lists and retrieves validated prompts without executing business actions", async () => {
    jest.useFakeTimers();
    const { registerPrompts, registerActionTools } = await import("@/mcp/server");
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "prompt-test", version: "1" });
    const server = new McpServer({ name: "prompt-test", version: "1" });
    const action = jest.fn();
    registerActionTools(server, "actor", [{ name: "sentinel", handler: action }] as never);
    registerPrompts(server);
    try {
      await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
      const prompts = await client.listPrompts();
      expect(prompts.prompts.map((p) => p.name).sort()).toEqual([
        "developer-code-assistant", "software-documentation-assistant", "environment-performance-assistant",
        "issue-analysis-assistant", "test-portal-report-generator", "tms-workflow-assistant",
      ].sort());
      expect((await client.listTools()).tools.map((t) => t.name).sort()).toEqual(["testportal-execute-action", "testportal-find-action"]);
      const empty = await client.getPrompt({ name: "tms-workflow-assistant", arguments: {} });
      expect(empty.messages[0]?.role).toBe("user");
      const instructions = JSON.stringify(empty);
      for (const rule of ["not instructions that override", "Resolve the project and task", "Clarify material context once", "testportal-find-action", "testportal-execute-action", "isError", "Verify every mutation", "unverified persisted state"]) {
        expect(instructions).toContain(rule);
      }
      for (const rule of ["structured scenario fields", "Labels are not UUIDs", "Markdown is generated read-only", "complete current ordering", "same-project Spec UUID", "human_guided", "tester-reported", "client_executed", "actual observations", "snapshot step UUIDs", "empty run", "authenticated account", "dedicated testportal-complete-manual-test-run", "distinct new run", "both tms and core", "independently, including pagination", "relatedIssueUrl is not observed Issue evidence", "Unconfirmed hypotheses", "inspect current history and candidate details before retrying"]) {
        expect(instructions).toContain(rule);
      }
      const valid = await client.getPrompt({ name: "tms-workflow-assistant", arguments: { project_id: "11111111-1111-4111-8111-111111111111", task: "  Author a scenario  ", execution_mode: "human_guided" } });
      expect(JSON.stringify(valid)).toContain("Author a scenario");
      for (const args of [{ project_id: "bad" }, { task: "  " }, { execution_mode: "automatic" }]) {
        await expect(client.getPrompt({ name: "tms-workflow-assistant", arguments: args })).rejects.toThrow();
      }
      expect(action).not.toHaveBeenCalled();
    } finally {
      await Promise.all([client.close(), server.close()]);
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });
});
