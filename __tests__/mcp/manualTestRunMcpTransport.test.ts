// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import request from "supertest";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { generateMcpToken } from "@/lib/mcp-token";
import { jsonBodyParser } from "@/middleware/json-body";
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

const mockStart = jest.fn();
const mockGet = jest.fn();
const mockUpdate = jest.fn();
const mockUpdateStep = jest.fn();
const mockComplete = jest.fn();
const mockResult = jest.fn();
const mockList = jest.fn();
const mockListForScenario = jest.fn();
const mockListActiveUsers = jest.fn();
const mockReassign = jest.fn();
const mockProfileCreate = jest.fn();
const mockProfileUpdate = jest.fn();
const mockProfileList = jest.fn();
const mockProfileRemove = jest.fn();

jest.mock("@/handlers/mcpManualRunEnvironmentProfileHandler", () => ({
  mcpManualRunEnvironmentProfileHandler: {
    create: mockProfileCreate,
    update: mockProfileUpdate,
    list: mockProfileList,
    remove: mockProfileRemove,
  },
}));

jest.mock("@/handlers/mcpManualTestRunHandler", () => ({
  mcpManualTestRunHandler: {
    start: mockStart,
    get: mockGet,
    update: mockUpdate,
    updateStep: mockUpdateStep,
    complete: mockComplete,
    updateResult: mockResult,
    list: mockList,
    listForScenario: mockListForScenario,
    listActiveUsers: mockListActiveUsers,
    reassignExecutor: mockReassign,
  },
}));

const callAction = (
  client: Client,
  request: { name: string; arguments?: Record<string, unknown> },
) =>
  client.callTool({
    name: "testportal-execute-action",
    arguments: { actionId: request.name, arguments: request.arguments ?? {} },
  });

const projectId = testUuid(1);
const scenarioId = testUuid(2);
const runId = testUuid(3);
const stepId = testUuid(4);
const userId = testUuid(5);
const absentUserId = testUuid(6);
const secret = "manual-run-transport-test-secret";

describe("manual run Streamable HTTP MCP transport", () => {
  let server: ReturnType<typeof createServer>;
  let client: Client;
  let transport: StreamableHTTPClientTransport;

  beforeEach(async () => {
    jest.useFakeTimers({ doNotFake: ["setImmediate"] });
    jest.clearAllMocks();
    process.env.MCP_SECRET = secret;
    const { default: router } = await import("@/mcp/server");
    const app = express();
    app.use(jsonBodyParser);
    app.use("/api", router);
    server = createServer(app);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );

    const address = server.address() as AddressInfo;
    client = new Client({
      name: "manual-run-transport-test",
      version: "1.0.0",
    });
    transport = new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${address.port}/api/v2/mcp`),
      {
        requestInit: {
          headers: {
            Authorization: `Bearer ${issueFixtureToken(userId, secret)}`,
          },
        },
      },
    );
    await client.connect(transport);
  });

  afterEach(async () => {
    await client.close();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    jest.useRealTimers();
    delete process.env.MCP_SECRET;
  });

  it("discovers both public tools and rejects missing authentication", async () => {
    const catalog = await client.listTools();
    expect(catalog.tools.map(({ name }) => name).sort()).toEqual([
      "testportal-execute-action",
      "testportal-find-action",
    ]);

    const address = server.address() as AddressInfo;
    const unauthenticated = await request(`http://127.0.0.1:${address.port}`)
      .post("/api/v2/mcp")
      .send({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    expect(unauthenticated.status).toBe(401);
  });

  it("advertises and enforces the limit of 100 explicit start scenarios over HTTP", async () => {
    const startAction = "testportal-start-manual-test-run";
    const found = await client.callTool({
      name: "testportal-find-action",
      arguments: { actionId: startAction },
    });
    expect(found.isError).not.toBe(true);
    const schema = found.content[0];
    expect(
      JSON.parse(schema?.type === "text" ? schema.text : "{}"),
    ).toMatchObject({
      actions: [
        {
          actionId: startAction,
          inputSchema: {
            anyOf: expect.arrayContaining([
              expect.objectContaining({
                properties: expect.objectContaining({
                  scenarioIds: expect.objectContaining({ maxItems: 100 }),
                }),
              }),
            ]),
          },
        },
      ],
    });

    mockStart.mockResolvedValue({ id: runId });
    const scenarioIds = Array.from({ length: 100 }, (_, index) =>
      testUuid(index + 100),
    );
    const start = { projectId, scenarioIds };
    expect(
      (await callAction(client, { name: startAction, arguments: start }))
        .isError,
    ).not.toBe(true);
    expect(mockStart).toHaveBeenCalledWith(start, userId);

    const oversized = {
      projectId,
      scenarioIds: [...scenarioIds, testUuid(200)],
    };
    const rejected = await callAction(client, {
      name: startAction,
      arguments: oversized,
    });
    expect(rejected.isError).toBe(true);
    expect(mockStart).toHaveBeenCalledTimes(1);

    const suite = { projectId, suiteId: testUuid(201) };
    expect(
      (await callAction(client, { name: startAction, arguments: suite }))
        .isError,
    ).not.toBe(true);
    expect(mockStart).toHaveBeenLastCalledWith(suite, userId);

    mockUpdate.mockResolvedValue({ id: runId });
    const update = {
      ...oversized,
      runId,
      title: "Expanded run",
      environmentProperties: [],
    };
    expect(
      (
        await callAction(client, {
          name: "testportal-update-manual-test-run",
          arguments: update,
        })
      ).isError,
    ).not.toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(update);
  });

  it("dispatches start and update requests with large valid run details", async () => {
    jest.useRealTimers();
    mockStart.mockResolvedValue({ id: runId });
    mockUpdate.mockResolvedValue({ id: runId });
    const environmentProperties = Array.from({ length: 100 }, (_, index) => ({
      name: `Property ${index + 1}`,
      value: "環".repeat(2_000),
    }));
    const start = {
      projectId,
      scenarioIds: [scenarioId],
      environmentProperties,
    };
    const update = {
      projectId,
      runId,
      title: "Expanded run",
      scenarioIds: Array.from({ length: 10_000 }, (_, index) =>
        testUuid(index + 100),
      ),
      environmentProperties,
    };

    const address = server.address() as AddressInfo;
    const endpoint = request(`http://127.0.0.1:${address.port}`);
    const sessionId = transport.sessionId;
    if (!sessionId) throw new Error("Expected an initialized MCP session");
    const actions = [
      ["testportal-start-manual-test-run", start],
      ["testportal-update-manual-test-run", update],
    ] as const;
    for (const [index, [actionId, args]] of actions.entries()) {
      await endpoint
        .post("/api/v2/mcp")
        .set("Authorization", `Bearer ${credentials.get(userId)}`)
        .set("mcp-session-id", sessionId)
        .set("Accept", "application/json, text/event-stream")
        .send({
          jsonrpc: "2.0",
          id: 100 + index,
          method: "tools/call",
          params: {
            name: "testportal-execute-action",
            arguments: { actionId, arguments: args },
          },
        })
        .expect(200);
    }
    expect(mockStart).toHaveBeenCalledWith(start, userId);
    expect(mockUpdate).toHaveBeenCalledWith(update);
  });

  it("discovers profile tools and validates identity and input before mutation", async () => {
    const found = await client.callTool({
      name: "testportal-find-action",
      arguments: {
        actionId: "testportal-create-manual-run-environment-profile",
      },
    });
    expect(found.isError).not.toBe(true);

    mockProfileCreate.mockResolvedValue({ id: runId });
    const create = "testportal-create-manual-run-environment-profile";
    const update = "testportal-update-manual-run-environment-profile";
    expect(
      (
        await callAction(client, {
          name: create,
          arguments: { projectId, name: " Profile ", browser: " " },
        })
      ).isError,
    ).not.toBe(true);
    expect(mockProfileCreate).toHaveBeenCalledWith(
      { projectId, name: "Profile", browser: null },
      userId,
    );

    for (const args of [
      { projectId: "invalid", name: "x" },
      { projectId, name: "x", ownerId: userId },
      { projectId, name: "x", build: "x" },
    ]) {
      expect(
        (await callAction(client, { name: create, arguments: args })).isError,
      ).toBe(true);
    }
    expect(mockProfileCreate).toHaveBeenCalledTimes(1);

    expect(
      (
        await callAction(client, {
          name: update,
          arguments: { projectId, profileId: runId },
        })
      ).isError,
    ).toBe(true);
    expect(mockProfileUpdate).not.toHaveBeenCalled();

    mockProfileUpdate.mockResolvedValue({ id: runId });
    await callAction(client, {
      name: update,
      arguments: { projectId, profileId: runId, device: "  " },
    });
    expect(mockProfileUpdate).toHaveBeenCalledWith({
      projectId,
      profileId: runId,
      device: null,
    });

    await callAction(client, {
      name: update,
      arguments: { projectId, profileId: runId, browser: null },
    });
    expect(mockProfileUpdate).toHaveBeenLastCalledWith({
      projectId,
      profileId: runId,
      browser: null,
    });

    mockProfileList.mockRejectedValue(new Error("Project not found"));
    expect(
      (
        await callAction(client, {
          name: "testportal-list-manual-run-environment-profiles",
          arguments: { projectId },
        })
      ).isError,
    ).toBe(true);

    const address = server.address() as AddressInfo;
    const foreign = await request(`http://127.0.0.1:${address.port}`)
      .post("/api/v2/mcp")
      .set("Authorization", `Bearer ${issueFixtureToken(absentUserId, secret)}`)
      .set("mcp-session-id", String(Reflect.get(transport, "sessionId")))
      .send({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "testportal-execute-action",
          arguments: { actionId: create, arguments: { projectId, name: "x" } },
        },
      });
    expect(foreign.status).toBe(403);
    expect(mockProfileCreate).toHaveBeenCalledTimes(1);
  });

  it("runs the scoped lifecycle, binds executor identity and rejects spoofing/implicit completion before mutation", async () => {
    const run = {
      id: runId,
      projectId,
      status: "in_progress",
      scenarios: [
        { id: scenarioId, result: "untested", steps: [{ id: stepId }] },
      ],
    };
    mockStart.mockResolvedValue(run);
    mockGet.mockResolvedValue(run);
    mockUpdateStep.mockResolvedValue(run);
    mockResult.mockResolvedValue(run);
    mockComplete.mockResolvedValue({ ...run, status: "completed" });

    const started = await callAction(client, {
      name: "testportal-start-manual-test-run",
      arguments: { projectId, scenarioIds: [scenarioId] },
    });
    expect(started.isError).not.toBe(true);
    expect(mockStart).toHaveBeenCalledWith(
      { projectId, scenarioIds: [scenarioId] },
      userId,
    );

    for (const arguments_ of [
      { projectId, scenarioIds: [scenarioId], executedById: userId },
      { projectId, scenarioIds: [scenarioId], steps: [] },
    ]) {
      const rejected = await callAction(client, {
        name: "testportal-start-manual-test-run",
        arguments: arguments_,
      });
      expect(rejected.isError).toBe(true);
    }
    expect(mockStart).toHaveBeenCalledTimes(1);

    const implicit = await callAction(client, {
      name: "testportal-update-manual-test-run",
      arguments: {
        projectId,
        runId,
        status: "passed",
        notes: "must not change",
      },
    });
    expect(implicit.isError).toBe(true);
    expect(mockUpdate).not.toHaveBeenCalled();

    await callAction(client, {
      name: "testportal-get-manual-test-run",
      arguments: { projectId, runId },
    });

    await callAction(client, {
      name: "testportal-update-manual-test-run-step",
      arguments: { projectId, runId, scenarioId, stepId, comment: "Observed" },
    });

    const result = { projectId, runId, scenarioId, result: "passed" };
    expect(
      (
        await callAction(client, {
          name: "testportal-update-manual-test-run-scenario-result",
          arguments: { ...result, resultById: userId },
        })
      ).isError,
    ).toBe(true);
    expect(
      (
        await callAction(client, {
          name: "testportal-update-manual-test-run-scenario-result",
          arguments: result,
        })
      ).isError,
    ).not.toBe(true);
    expect(mockResult).toHaveBeenCalledTimes(1);
    expect(mockResult).toHaveBeenCalledWith(result, userId);

    const completed = await callAction(client, {
      name: "testportal-complete-manual-test-run",
      arguments: { projectId, runId, requireAllMarked: true },
    });
    expect(completed.isError).not.toBe(true);
    expect(mockComplete).toHaveBeenCalledWith(
      { projectId, runId, requireAllMarked: true },
      userId,
    );
  });

  it("rejects reuse of a session by a different authenticated owner before handlers run", async () => {
    const address = server.address() as AddressInfo;
    const sessionId = Reflect.get(transport, "sessionId");
    expect(typeof sessionId).toBe("string");

    const response = await request(`http://127.0.0.1:${address.port}`)
      .post("/api/v2/mcp")
      .set("Authorization", `Bearer ${issueFixtureToken(absentUserId, secret)}`)
      .set("mcp-session-id", String(sessionId))
      .send({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "testportal-execute-action",
          arguments: {
            actionId: "testportal-start-manual-test-run",
            arguments: { projectId, scenarioIds: [scenarioId] },
          },
        },
      });

    expect(response.status).toBe(403);
    expect(response.body.error.message).toBe(
      "MCP session belongs to a different user",
    );
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("returns standard service errors and rejects unsupported history fields before service execution", async () => {
    mockGet.mockRejectedValue(new Error("Manual test run not found"));

    const serviceError = await callAction(client, {
      name: "testportal-get-manual-test-run",
      arguments: { projectId, runId },
    });
    expect(serviceError.isError).toBe(true);
    const content = serviceError.content[0];
    expect(content?.type === "text" ? content.text : "").toContain(
      "Error testportal-get-manual-test-run",
    );

    const invalidHistory = await callAction(client, {
      name: "testportal-list-test-scenario-manual-runs",
      arguments: { projectId, scenarioId, testScenarioId: scenarioId },
    });
    expect(invalidHistory.isError).toBe(true);
    expect(mockListForScenario).not.toHaveBeenCalled();

    mockList.mockResolvedValue({
      runs: [],
      total: 0,
      page: 1,
      limit: 30,
      totalPages: 0,
    });

    const history = await callAction(client, {
      name: "testportal-list-manual-test-runs",
      arguments: { projectId },
    });
    expect(history.isError).not.toBe(true);
    expect(mockList).toHaveBeenCalledWith({
      projectId,
      page: 1,
      limit: 30,
      show: "in_progress",
      period: "recent",
      timeZone: "UTC",
    });

    await callAction(client, {
      name: "testportal-list-manual-test-runs",
      arguments: {
        projectId,
        search: "AUTH-1",
        show: "completed",
        period: "custom",
        dateFrom: "2026-10-01",
        dateTo: "2026-11-01",
        page: 2,
        limit: 10,
      },
    });
    expect(mockList).toHaveBeenLastCalledWith({
      projectId,
      search: "AUTH-1",
      show: "completed",
      period: "custom",
      dateFrom: "2026-10-01",
      dateTo: "2026-11-01",
      page: 2,
      limit: 10,
      timeZone: "UTC",
    });

    const reversedRange = await callAction(client, {
      name: "testportal-list-manual-test-runs",
      arguments: {
        projectId,
        period: "custom",
        dateFrom: "2026-11-01",
        dateTo: "2026-10-01",
      },
    });
    expect(reversedRange.isError).toBe(true);
    expect(mockList).toHaveBeenCalledTimes(2);

    mockListForScenario.mockResolvedValue({
      runs: [],
      total: 0,
      page: 1,
      limit: 30,
      totalPages: 0,
    });
    await callAction(client, {
      name: "testportal-list-test-scenario-manual-runs",
      arguments: {
        projectId,
        scenarioId,
        period: "custom",
        dateFrom: "2026-10-01",
        dateTo: "2026-11-01",
      },
    });
    expect(mockListForScenario).toHaveBeenCalledWith({
      projectId,
      scenarioId,
      period: "custom",
      dateFrom: "2026-10-01",
      dateTo: "2026-11-01",
      page: 1,
      limit: 30,
      show: "in_progress",
      timeZone: "UTC",
    });

    mockListActiveUsers.mockResolvedValue([
      { id: userId, name: "User", email: "user@example.test" },
    ]);

    const users = await callAction(client, {
      name: "testportal-list-active-users",
      arguments: {},
    });
    expect(users.isError).not.toBe(true);
    expect(mockListActiveUsers).toHaveBeenCalledWith();
  });
});
