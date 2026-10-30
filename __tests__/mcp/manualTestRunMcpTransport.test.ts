// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import request from "supertest";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { generateMcpToken } from "@/lib/mcp-token";

const mockStart = jest.fn();
const mockGet = jest.fn();
const mockUpdate = jest.fn();
const mockUpdateStep = jest.fn();
const mockComplete = jest.fn();
const mockList = jest.fn();
const mockListForScenario = jest.fn();
const mockListActiveUsers = jest.fn();
const mockReassign = jest.fn();
const mockProfileCreate = jest.fn();
const mockProfileUpdate = jest.fn();
const mockProfileList = jest.fn();
const mockProfileRemove = jest.fn();

jest.mock("@/handlers/mcpManualRunEnvironmentProfileHandler", () => ({ mcpManualRunEnvironmentProfileHandler: {
  create: mockProfileCreate, update: mockProfileUpdate, list: mockProfileList, remove: mockProfileRemove,
} }));

jest.mock("@/handlers/mcpManualTestRunHandler", () => ({ mcpManualTestRunHandler: {
  start: mockStart, get: mockGet, update: mockUpdate, updateStep: mockUpdateStep,
  complete: mockComplete, list: mockList, listForScenario: mockListForScenario,
  listActiveUsers: mockListActiveUsers, reassignExecutor: mockReassign,
} }));

const callAction = (client: Client, request: { name: string; arguments?: Record<string, unknown> }) =>
  client.callTool({ name: "testportal-execute-action", arguments: { actionId: request.name, arguments: request.arguments ?? {} } });

const projectId = "11111111-1111-4111-8111-111111111111";
const scenarioId = "22222222-2222-4222-8222-222222222222";
const runId = "33333333-3333-4333-8333-333333333333";
const stepId = "44444444-4444-4444-8444-444444444444";
const userId = "55555555-5555-4555-8555-555555555555";
const secret = "manual-run-transport-test-secret";

describe("manual run Streamable HTTP MCP transport", () => {
  let server: ReturnType<typeof createServer>;
  let client: Client;
  let transport: StreamableHTTPClientTransport;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    process.env.MCP_SECRET = secret;
    const { default: router } = await import("@/mcp/server");
    const app = express();
    app.use(express.json());
    app.use("/api", router);
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    client = new Client({ name: "manual-run-transport-test", version: "1.0.0" });
    transport = new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${address.port}/api/v2/mcp`),
      { requestInit: { headers: { Authorization: `Bearer ${generateMcpToken(userId, secret)}` } } },
    );
    await client.connect(transport);
  });

  afterEach(async () => {
    await client.close();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    jest.useRealTimers();
    delete process.env.MCP_SECRET;
  });

  it("discovers exactly nine canonical tools and rejects missing authentication", async () => {
    const catalog = await client.listTools();
    expect(catalog.tools.map(({ name }) => name).sort()).toEqual(["testportal-execute-action", "testportal-find-action"]);
    const address = server.address() as AddressInfo;
    const unauthenticated = await request(`http://127.0.0.1:${address.port}`)
      .post("/api/v2/mcp").send({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    expect(unauthenticated.status).toBe(401);
  });

  it("discovers profile tools and validates identity and input before mutation", async () => {
    const found = await client.callTool({ name: "testportal-find-action", arguments: { actionId: "testportal-create-manual-run-environment-profile" } });
    expect(found.isError).not.toBe(true);
    mockProfileCreate.mockResolvedValue({ id: runId });
    const create = "testportal-create-manual-run-environment-profile";
    const update = "testportal-update-manual-run-environment-profile";
    expect((await callAction(client, { name: create, arguments: { projectId, name: " Profile ", browser: " " } })).isError).not.toBe(true);
    expect(mockProfileCreate).toHaveBeenCalledWith({ projectId, name: "Profile", browser: null }, userId);
    for (const args of [{ projectId: "invalid", name: "x" }, { projectId, name: "x", ownerId: userId }, { projectId, name: "x", build: "x" }]) {
      expect((await callAction(client, { name: create, arguments: args })).isError).toBe(true);
    }
    expect(mockProfileCreate).toHaveBeenCalledTimes(1);
    expect((await callAction(client, { name: update, arguments: { projectId, profileId: runId } })).isError).toBe(true);
    expect(mockProfileUpdate).not.toHaveBeenCalled();
    mockProfileUpdate.mockResolvedValue({ id: runId });
    await callAction(client, { name: update, arguments: { projectId, profileId: runId, device: "  " } });
    expect(mockProfileUpdate).toHaveBeenCalledWith({ projectId, profileId: runId, device: null });
    await callAction(client, { name: update, arguments: { projectId, profileId: runId, browser: null } });
    expect(mockProfileUpdate).toHaveBeenLastCalledWith({ projectId, profileId: runId, browser: null });
    mockProfileList.mockRejectedValue(new Error("Project not found"));
    expect((await callAction(client, { name: "testportal-list-manual-run-environment-profiles", arguments: { projectId } })).isError).toBe(true);
    const address = server.address() as AddressInfo;
    const foreign = await request(`http://127.0.0.1:${address.port}`).post("/api/v2/mcp")
      .set("Authorization", `Bearer ${generateMcpToken("66666666-6666-4666-8666-666666666666", secret)}`)
      .set("mcp-session-id", String(Reflect.get(transport, "sessionId")))
      .send({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "testportal-execute-action", arguments: { actionId: create, arguments: { projectId, name: "x" } } } });
    expect(foreign.status).toBe(403);
    expect(mockProfileCreate).toHaveBeenCalledTimes(1);
  });

  it("runs the scoped lifecycle, binds executor identity and rejects spoofing/implicit completion before mutation", async () => {
    const run = { id: runId, projectId, status: "in_progress", steps: [{ id: stepId, status: "not_started" }] };
    mockStart.mockResolvedValue(run);
    mockGet.mockResolvedValue(run);
    mockUpdateStep.mockResolvedValue(run);
    mockComplete.mockResolvedValue({ ...run, status: "passed" });

    const started = await callAction(client, { name: "testportal-start-manual-test-run", arguments: { projectId, scenarioId } });
    expect(started.isError).not.toBe(true);
    expect(mockStart).toHaveBeenCalledWith({ projectId, scenarioId }, userId);

    for (const arguments_ of [
      { projectId, scenarioId, executedById: userId },
      { projectId, scenarioId, title: "snapshot injection" },
    ]) {
      const rejected = await callAction(client, { name: "testportal-start-manual-test-run", arguments: arguments_ });
      expect(rejected.isError).toBe(true);
    }
    expect(mockStart).toHaveBeenCalledTimes(1);

    const implicit = await callAction(client, { name: "testportal-update-manual-test-run", arguments: { projectId, runId, status: "passed", notes: "must not change" } });
    expect(implicit.isError).toBe(true);
    expect(mockUpdate).not.toHaveBeenCalled();

    await callAction(client, { name: "testportal-get-manual-test-run", arguments: { projectId, runId } });
    await callAction(client, { name: "testportal-update-manual-test-run-step", arguments: { projectId, runId, stepId, status: "passed" } });
    const completed = await callAction(client, { name: "testportal-complete-manual-test-run", arguments: { projectId, runId, status: "passed" } });
    expect(completed.isError).not.toBe(true);
    expect(mockComplete).toHaveBeenCalledWith({ projectId, runId, status: "passed" });
  });

  it("rejects reuse of a session by a different authenticated owner before handlers run", async () => {
    const address = server.address() as AddressInfo;
    const sessionId = Reflect.get(transport, "sessionId");
    expect(typeof sessionId).toBe("string");
    const response = await request(`http://127.0.0.1:${address.port}`)
      .post("/api/v2/mcp")
      .set("Authorization", `Bearer ${generateMcpToken("66666666-6666-4666-8666-666666666666", secret)}`)
      .set("mcp-session-id", String(sessionId))
      .send({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "testportal-execute-action", arguments: { actionId: "testportal-start-manual-test-run", arguments: { projectId, scenarioId } } } });
    expect(response.status).toBe(403);
    expect(response.body.error.message).toBe("MCP session belongs to a different user");
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("returns standard service errors and rejects unsupported history fields before service execution", async () => {
    mockGet.mockRejectedValue(new Error("Manual test run not found"));
    const serviceError = await callAction(client, { name: "testportal-get-manual-test-run", arguments: { projectId, runId } });
    expect(serviceError.isError).toBe(true);
    const content = serviceError.content[0];
    expect(content?.type === "text" ? content.text : "").toContain("Error fetching manual test run");

    const invalidHistory = await callAction(client, { name: "testportal-list-test-scenario-manual-runs", arguments: { projectId, scenarioId, testScenarioId: scenarioId } });
    expect(invalidHistory.isError).toBe(true);
    expect(mockListForScenario).not.toHaveBeenCalled();

    mockList.mockResolvedValue({ runs: [], total: 0, page: 1, limit: 30, totalPages: 0 });
    const history = await callAction(client, { name: "testportal-list-manual-test-runs", arguments: { projectId } });
    expect(history.isError).not.toBe(true);
    expect(mockList).toHaveBeenCalledWith({ projectId, page: 1, limit: 30 });
    await callAction(client, {
      name: "testportal-list-manual-test-runs",
      arguments: { projectId, testScenarioId: scenarioId, sourceScenarioKey: "AUTH-1", status: "failed", startedFrom: "2026-10-01T00:00:00Z", startedBefore: "2026-11-01T00:00:00Z", page: 2, limit: 10 },
    });
    expect(mockList).toHaveBeenLastCalledWith({ projectId, testScenarioId: scenarioId, sourceScenarioKey: "AUTH-1", status: "failed", startedFrom: "2026-10-01T00:00:00Z", startedBefore: "2026-11-01T00:00:00Z", page: 2, limit: 10 });
    const reversedRange = await callAction(client, { name: "testportal-list-manual-test-runs", arguments: { projectId, startedFrom: "2026-11-01T00:00:00Z", startedBefore: "2026-10-01T00:00:00Z" } });
    expect(reversedRange.isError).toBe(true);
    expect(mockList).toHaveBeenCalledTimes(2);
    mockListForScenario.mockResolvedValue({ runs: [], total: 0, page: 1, limit: 30, totalPages: 0 });
    await callAction(client, { name: "testportal-list-test-scenario-manual-runs", arguments: { projectId, scenarioId, startedFrom: "2026-10-01T00:00:00Z", startedBefore: "2026-11-01T00:00:00Z" } });
    expect(mockListForScenario).toHaveBeenCalledWith({ projectId, scenarioId, startedFrom: "2026-10-01T00:00:00Z", startedBefore: "2026-11-01T00:00:00Z", page: 1, limit: 30 });

    mockListActiveUsers.mockResolvedValue([{ id: userId, name: "User", email: "user@example.test" }]);
    const users = await callAction(client, { name: "testportal-list-active-users", arguments: {} });
    expect(users.isError).not.toBe(true);
    expect(mockListActiveUsers).toHaveBeenCalledWith();
  });
});
