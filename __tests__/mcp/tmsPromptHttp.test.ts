// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import express from "express";
import request from "supertest";
import { generateMcpToken } from "@/lib/mcp-token";
import { userService } from "@/services/userService";
import { jwtService } from "@/services/jwtService";
import promptRouter from "@/routes/promptRoutes";
import { userModel } from "@/models/userModel";
import { testUuid } from "@/test-utils/testUuid";

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
const user = testUuid(1);
const token = issueFixtureToken(user, secret);
const envelope = (id: number, name: string, args?: unknown) => ({
  jsonrpc: "2.0",
  id,
  method: "prompts/get",
  params: { name, ...(args === undefined ? {} : { arguments: args }) },
});
const messages = (text: string) =>
  text
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => JSON.parse(line.slice(6)));

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
    app.use("/api", promptRouter);
    const post = () =>
      request(app)
        .post("/api/v2/mcp")
        .set("Accept", "application/json, text/event-stream")
        .set("Authorization", `Bearer ${token}`);

    const timestamp = new Date("2026-01-01T00:00:00.000Z");
    const userLookup = jest
      .spyOn(userService, "getUserById")
      .mockResolvedValue({
        id: user,
        name: "Tester",
        email: "tester@example.test",
        status: "active",
        role: "member",
        createdAt: timestamp,
        updatedAt: timestamp,
        passwordHash: null,
        cognitoUserId: null,
        mcpToken: token,
        reportPortalUrl: null,
        reportPortalEnabled: false,
        monitoringPortalUrl: null,
        monitoringPortalEnabled: false,
        analyzeEnabled: false,
      });

    try {
      const init = await post().send({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "test", version: "1" },
        },
      });
      const session = init.headers["mcp-session-id"] as string;
      expect(session).toBeTruthy();
      const call = (body: object) =>
        post().set("mcp-session-id", session).send(body);

      const omitted = await call({
        ...envelope(2, "tms-workflow-assistant"),
        params: {
          name: "tms-workflow-assistant",
          _meta: { progressToken: "p" },
        },
      });
      const result = messages(omitted.text)[0];
      expect(result.id).toBe(2);
      expect(result.result.messages[0].content.text).toContain(
        "TMS workflow assistant",
      );
      const explicit = messages(
        (await call(envelope(3, "tms-workflow-assistant", {}))).text,
      )[0];
      expect(explicit.result).toEqual(result.result);

      const valid = messages(
        (
          await call(
            envelope(4, "tms-workflow-assistant", {
              project_id: user,
              task: "Create case",
              execution_mode: "client_executed",
            }),
          )
        ).text,
      )[0];
      expect(JSON.stringify(valid.result)).toContain("Create case");

      const organize = {
        project_id: user,
        task: "Create a scenario, put it in Payments, and add it to Checkout Regression",
      };
      const mcpPrompt = messages(
        (await call(envelope(5, "tms-workflow-assistant", organize))).text,
      )[0].result.messages[0].content.text;
      const restToken = jwtService.generateAccessToken({
        userId: user,
        email: "tester@example.test",
      });
      const restPrompt = await request(app)
        .post("/api/v2/prompts/tms-workflow-assistant/generate")
        .set("Authorization", `Bearer ${restToken}`)
        .send(organize)
        .expect(200);
      expect(restPrompt.body.generated_prompt).toBe(mcpPrompt);
      for (const instruction of [
        organize.task,
        "report the saved scenario key and identify the unresolved follow-up",
        "check what persisted before retrying that follow-up",
        "Reuse the saved scenario UUID",
        "human_guided",
        "client_executed",
        "Leave unobserved scenarios untested",
      ]) {
        expect(mcpPrompt).toContain(instruction);
      }

      for (const [i, args] of [
        { project_id: "bad" },
        { task: " " },
        { execution_mode: "bad" },
        null,
        [],
        "bad",
        { task: 4 },
      ].entries()) {
        const response = await call(
          envelope(10 + i, "tms-workflow-assistant", args),
        );
        expect(
          response.status >= 400 || messages(response.text)[0]?.error,
        ).toBeTruthy();
      }
      expect(
        messages((await call(envelope(20, "unknown", {}))).text)[0].error,
      ).toBeDefined();

      expect(
        messages(
          (
            await call(
              envelope(21, "issue-analysis-assistant", {
                analysis_scope: "recent",
              }),
            )
          ).text,
        )[0].result,
      ).toBeDefined();
      expect(
        messages(
          (await call(envelope(22, "issue-analysis-assistant", {}))).text,
        )[0].error,
      ).toBeDefined();

      const batch = await call([
        envelope(23, "tms-workflow-assistant"),
        { jsonrpc: "2.0", id: 24, method: "tools/list" },
      ]);
      const replies = messages(batch.text);
      expect(replies.map((item) => item.id).sort()).toEqual([23, 24]);
      expect(
        replies.find((item) => item.id === 23).result.messages,
      ).toBeDefined();
      expect(
        replies
          .find((item) => item.id === 24)
          .result.tools.map((t: { name: string }) => t.name)
          .sort(),
      ).toEqual(["testportal-execute-action", "testportal-find-action"]);

      const prompts = messages(
        (await call({ jsonrpc: "2.0", id: 25, method: "prompts/list" })).text,
      )[0].result.prompts;
      expect(prompts).toHaveLength(6);

      expect(
        (
          await request(app)
            .post("/api/v2/mcp")
            .send(envelope(26, "tms-workflow-assistant"))
        ).status,
      ).toBe(401);
      const foreign = await request(app)
        .post("/api/v2/mcp")
        .set(
          "Authorization",
          `Bearer ${issueFixtureToken(testUuid(2), secret)}`,
        )
        .set("mcp-session-id", session)
        .send(envelope(27, "tms-workflow-assistant"));
      expect(foreign.status).toBe(403);
    } finally {
      userLookup.mockRestore();
      delete process.env.MCP_SECRET;
    }
  });
});
