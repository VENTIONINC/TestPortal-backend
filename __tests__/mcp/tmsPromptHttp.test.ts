// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import express from "express";
import request from "supertest";
import { generateMcpToken } from "@/lib/mcp-token";
import { userModel } from "@/models/userModel";

const credentials = new Map<string, string>();
const issueFixtureToken = (id: string, secret: string) => {
  const token = generateMcpToken(id, secret);
  credentials.set(id, token);
  return token;
};
jest.spyOn(userModel, "findMcpCredential").mockImplementation(async (id) => {
  const token = credentials.get(id);
  return token ? { mcpToken: token } : null;
});

const secret = "prompt-http-test-secret";
const user = "11111111-1111-4111-8111-111111111111";
const token = issueFixtureToken(user, secret);
const envelope = (id: number, name: string, args?: unknown) => ({ jsonrpc: "2.0", id, method: "prompts/get", params: { name, ...(args === undefined ? {} : { arguments: args }) } });
const messages = (text: string) => text.split("\n").filter((line) => line.startsWith("data: ")).map((line) => JSON.parse(line.slice(6)));

describe("authenticated prompt HTTP protocol", () => {
  it("preserves retrieval, validation and session isolation", async () => {
    jest.useFakeTimers();
    process.env.MCP_SECRET = secret;
    const { default: router } = await import("@/mcp/server");
    jest.clearAllTimers();
    jest.useRealTimers();
    const app = express();
    app.use(express.json());
    app.use("/api", router);
    const post = () => request(app).post("/api/v2/mcp").set("Accept", "application/json, text/event-stream").set("Authorization", `Bearer ${token}`);
    try {
      const init = await post().send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "1" } } });
      const session = init.headers["mcp-session-id"] as string;
      expect(session).toBeTruthy();
      const call = (body: object) => post().set("mcp-session-id", session).send(body);
      const omitted = await call({ ...envelope(2, "tms-workflow-assistant"), params: { name: "tms-workflow-assistant", _meta: { progressToken: "p" } } });
      const result = messages(omitted.text)[0];
      expect(result.id).toBe(2);
      expect(result.result.messages[0].content.text).toContain("TMS workflow assistant");
      const explicit = messages((await call(envelope(3, "tms-workflow-assistant", {}))).text)[0];
      expect(explicit.result).toEqual(result.result);
      const valid = messages((await call(envelope(4, "tms-workflow-assistant", { project_id: user, task: "Create case", execution_mode: "client_executed" }))).text)[0];
      expect(JSON.stringify(valid.result)).toContain("Create case");
      for (const [i, args] of [ { project_id: "bad" }, { task: " " }, { execution_mode: "bad" }, null, [], "bad", { task: 4 } ].entries()) {
        const response = await call(envelope(10 + i, "tms-workflow-assistant", args));
        expect(response.status >= 400 || messages(response.text)[0]?.error).toBeTruthy();
      }
      expect(messages((await call(envelope(20, "unknown", {}))).text)[0].error).toBeDefined();
      expect(messages((await call(envelope(21, "issue-analysis-assistant", { analysis_scope: "recent" }))).text)[0].result).toBeDefined();
      expect(messages((await call(envelope(22, "issue-analysis-assistant", {}))).text)[0].error).toBeDefined();
      const batch = await call([envelope(23, "tms-workflow-assistant"), { jsonrpc: "2.0", id: 24, method: "tools/list" }]);
      const replies = messages(batch.text);
      expect(replies.map((item) => item.id).sort()).toEqual([23, 24]);
      expect(replies.find((item) => item.id === 23).result.messages).toBeDefined();
      expect(replies.find((item) => item.id === 24).result.tools.map((t: { name: string }) => t.name).sort()).toEqual(["testportal-execute-action", "testportal-find-action"]);
      const prompts = messages((await call({ jsonrpc: "2.0", id: 25, method: "prompts/list" })).text)[0].result.prompts;
      expect(prompts).toHaveLength(6);
      expect((await request(app).post("/api/v2/mcp").send(envelope(26, "tms-workflow-assistant"))).status).toBe(401);
      const foreign = await request(app).post("/api/v2/mcp").set("Authorization", `Bearer ${issueFixtureToken("22222222-2222-4222-8222-222222222222", secret)}`).set("mcp-session-id", session).send(envelope(27, "tms-workflow-assistant"));
      expect(foreign.status).toBe(403);
    } finally {
      delete process.env.MCP_SECRET;
    }
  });
});
