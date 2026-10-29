// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { generateMcpToken } from "@/lib/mcp-token";

const mockListTestScenarios = jest.fn();
const mockGetTestScenario = jest.fn();
const mockUpdateTestScenario = jest.fn();
const mockDeleteTestScenario = jest.fn();
const mockAppendScenarioStep = jest.fn();
const mockUpdateScenarioStep = jest.fn();
const mockDeleteScenarioStep = jest.fn();
const mockReorderScenarioSteps = jest.fn();
const mockCreateTestScenario = jest.fn();

jest.mock("@/handlers/mcpTestScenarioHandler", () => ({
  mcpTestScenarioHandler: {
    createTestScenario: mockCreateTestScenario,
    listTestScenarios: mockListTestScenarios,
    getTestScenario: mockGetTestScenario,
    updateTestScenario: mockUpdateTestScenario,
    deleteTestScenario: mockDeleteTestScenario,
    appendTestScenarioStep: mockAppendScenarioStep,
    updateTestScenarioStep: mockUpdateScenarioStep,
    deleteTestScenarioStep: mockDeleteScenarioStep,
    reorderTestScenarioSteps: mockReorderScenarioSteps,
  },
}));


const projectId = "11111111-1111-1111-1111-111111111111";
const scenarioId = "22222222-2222-2222-2222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const secret = "scenario-mcp-transport-test-secret";

describe("Test Scenario MCP transport validation", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("discovers the complete prefixed tool catalog and unchanged prompts", async () => {
    const { default: mcpRouter } = await import("@/mcp/server");
    const app = express();
    app.use(express.json());
    app.use("/api", mcpRouter);
    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    const client = new Client({ name: "catalog-test", version: "1.0.0" });
    process.env.MCP_SECRET = secret;
    await client.connect(new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${address.port}/api/v2/mcp`),
      { requestInit: { headers: { Authorization: `Bearer ${generateMcpToken(userId, secret)}` } } },
    ));

    try {
      const catalog = await client.listTools();
      const names = catalog.tools.map(({ name }) => name);
      expect(names.sort()).toEqual([
        "testportal-append-test-scenario-step",
        "testportal-assign-issue-to-result-error",
        "testportal-bulk-review-result-errors",
        "testportal-check-status",
        "testportal-complete-manual-test-run",
        "testportal-create-assumption",
        "testportal-create-issue",
        "testportal-create-test-scenario",
        "testportal-current-time",
        "testportal-delete-test-scenario",
        "testportal-delete-test-scenario-step",
        "testportal-get-assumption-by-id",
        "testportal-get-available-projects",
        "testportal-get-execution-by-id",
        "testportal-get-issue-by-id",
        "testportal-get-issues",
        "testportal-get-manual-test-run",
        "testportal-get-result-by-id",
        "testportal-get-result-error-by-id",
        "testportal-get-results",
        "testportal-get-results-stats",
        "testportal-get-spec-by-id",
        "testportal-get-test-scenario",
        "testportal-list-active-users",
        "testportal-list-manual-test-runs",
        "testportal-list-test-scenario-manual-runs",
        "testportal-list-test-scenarios",
        "testportal-reassign-manual-test-run-executor",
        "testportal-reorder-test-scenario-steps",
        "testportal-review-result-error",
        "testportal-start-manual-test-run",
        "testportal-update-assumption",
        "testportal-update-manual-test-run",
        "testportal-update-manual-test-run-step",
        "testportal-update-test-scenario",
        "testportal-update-test-scenario-step",
      ]);
      expect(new Set(names).size).toBe(names.length);
      expect(names.every((name) => name.startsWith("testportal-"))).toBe(true);
      expect(names.some((name) => name.startsWith("testportal-testportal-"))).toBe(false);
      expect(names).not.toContain("testportal-get-issues-with-stats");

      const prompts = await client.listPrompts();
      expect(prompts.prompts.map(({ name }) => name).sort()).toEqual([
        "developer-code-assistant",
        "environment-performance-assistant",
        "issue-analysis-assistant",
        "software-documentation-assistant",
        "test-portal-report-generator",
      ]);
      const status = await client.callTool({
        name: "testportal-check-status",
        arguments: {},
      });
      expect(status.isError).not.toBe(true);
      const statusText = status.content[0];
      expect(statusText?.type).toBe("text");
      expect(JSON.parse(statusText?.type === "text" ? statusText.text : "{}")).toMatchObject({
        status: "ok",
        service: "test-portal-server",
      });
    } finally {
      await client.close();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      delete process.env.MCP_SECRET;
    }
  });

  it("rejects legacy read and mutation names without running their handlers", async () => {
    const { default: mcpRouter } = await import("@/mcp/server");
    const app = express();
    app.use(express.json());
    app.use("/api", mcpRouter);
    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    const client = new Client({ name: "legacy-name-test", version: "1.0.0" });
    process.env.MCP_SECRET = secret;
    await client.connect(new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${address.port}/api/v2/mcp`),
      { requestInit: { headers: { Authorization: `Bearer ${generateMcpToken(userId, secret)}` } } },
    ));

    try {
      const calls = [
        ["get-test-scenario", { scenarioId, projectId }],
        ["append-test-scenario-step", { scenarioId, projectId, action: "Open" }],
      ] as const;
      for (const [name, arguments_] of calls) {
        const response = await client.callTool({ name, arguments: arguments_ });
        expect(response.isError).toBe(true);
        const errorContent = response.content[0];
        expect(errorContent?.type).toBe("text");
        expect(errorContent?.type === "text" ? errorContent.text : "").toMatch(
          /tool .* not found/i,
        );
      }
      expect(mockGetTestScenario).not.toHaveBeenCalled();
      expect(mockAppendScenarioStep).not.toHaveBeenCalled();
    } finally {
      await client.close();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      delete process.env.MCP_SECRET;
    }
  });

  it("keeps strict and refined schemas active at the transport boundary", async () => {
    const { default: mcpRouter } = await import("@/mcp/server");
    const app = express();
    app.use(express.json());
    app.use("/api", mcpRouter);
    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    const client = new Client({ name: "scenario-schema-test", version: "1.0.0" });
    process.env.MCP_SECRET = secret;
    await client.connect(new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${address.port}/api/v2/mcp`),
      { requestInit: { headers: { Authorization: `Bearer ${generateMcpToken(userId, secret)}` } } },
    ));

    try {
      const unknownFieldResponse = await client.callTool({
        name: "testportal-update-test-scenario",
        arguments: {
          scenarioId,
          projectId,
          title: "A valid edit",
          unexpected: true,
        },
      });
      expect(unknownFieldResponse.isError).toBe(true);
      expect(mockUpdateTestScenario).not.toHaveBeenCalled();

      const invalidCases = [
        ["testportal-append-test-scenario-step", { projectId, scenarioId, action: "  " }],
        [
          "testportal-update-test-scenario-step",
          { projectId, scenarioId, stepId: scenarioId },
        ],
        [
          "testportal-update-test-scenario-step",
          {
            projectId,
            scenarioId,
            stepId: scenarioId,
            action: "Edit",
            extra: true,
          },
        ],
        [
          "testportal-delete-test-scenario-step",
          { projectId: "bad", scenarioId, stepId: scenarioId },
        ],
        [
          "testportal-reorder-test-scenario-steps",
          { projectId, scenarioId, stepIds: ["bad"] },
        ],
      ] as const;
      for (const [name, arguments_] of invalidCases) {
        const response = await client.callTool({ name, arguments: arguments_ });
        expect(response.isError).toBe(true);
      }
      expect(mockAppendScenarioStep).not.toHaveBeenCalled();
      expect(mockUpdateScenarioStep).not.toHaveBeenCalled();
      expect(mockDeleteScenarioStep).not.toHaveBeenCalled();
      expect(mockReorderScenarioSteps).not.toHaveBeenCalled();

      const refinementResponse = await client.callTool({
        name: "testportal-update-test-scenario",
        arguments: { scenarioId, projectId },
      });
      expect(refinementResponse.isError).toBe(true);
      expect(mockUpdateTestScenario).not.toHaveBeenCalled();
    } finally {
      await client.close();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      delete process.env.MCP_SECRET;
    }
  });

  it("runs a scenario step lifecycle through the authenticated MCP transport", async () => {
    const { default: mcpRouter } = await import("@/mcp/server");
    const app = express();
    app.use(express.json());
    app.use("/api", mcpRouter);
    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    const client = new Client({ name: "scenario-lifecycle-test", version: "1.0.0" });
    process.env.MCP_SECRET = secret;
    await client.connect(new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${address.port}/api/v2/mcp`),
      { requestInit: { headers: { Authorization: `Bearer ${generateMcpToken(userId, secret)}` } } },
    ));
    const fullScenario = { id: scenarioId, projectId, steps: [] };
    mockCreateTestScenario.mockResolvedValue(fullScenario);
    mockGetTestScenario.mockResolvedValue({ scenario: fullScenario });
    mockAppendScenarioStep.mockResolvedValue(fullScenario);
    mockUpdateScenarioStep.mockResolvedValue(fullScenario);
    mockDeleteScenarioStep.mockResolvedValue(fullScenario);
    mockReorderScenarioSteps.mockResolvedValue(fullScenario);

    try {
      const catalog = await client.listTools();
      expect(catalog.tools.map(({ name }) => name)).toEqual(
        expect.arrayContaining([
          "testportal-create-test-scenario",
          "testportal-list-test-scenarios",
          "testportal-get-test-scenario",
          "testportal-update-test-scenario",
          "testportal-delete-test-scenario",
          "testportal-append-test-scenario-step",
          "testportal-update-test-scenario-step",
          "testportal-delete-test-scenario-step",
          "testportal-reorder-test-scenario-steps",
        ]),
      );
      const responses = [];
      responses.push(await client.callTool({
        name: "testportal-create-test-scenario",
        arguments: { projectId, title: "Temporary MCP scenario" },
      }));
      responses.push(await client.callTool({
        name: "testportal-append-test-scenario-step",
        arguments: { projectId, scenarioId, action: "Open" },
      }));
      responses.push(await client.callTool({
        name: "testportal-update-test-scenario-step",
        arguments: {
          projectId,
          scenarioId,
          stepId: "44444444-4444-4444-8444-444444444444",
          expectedResult: null,
        },
      }));
      responses.push(await client.callTool({
        name: "testportal-reorder-test-scenario-steps",
        arguments: { projectId, scenarioId, stepIds: [] },
      }));
      responses.push(await client.callTool({
        name: "testportal-delete-test-scenario-step",
        arguments: {
          projectId,
          scenarioId,
          stepId: "44444444-4444-4444-8444-444444444444",
        },
      }));
      responses.push(await client.callTool({
        name: "testportal-get-test-scenario",
        arguments: { projectId, scenarioId },
      }));

      expect(responses.every(({ isError }) => isError !== true)).toBe(true);
      const decodedResponses = responses.map((response) => {
        const content = response.content[0];
        expect(content?.type).toBe("text");
        return JSON.parse(content?.type === "text" ? content.text : "{}");
      });
      expect(decodedResponses.slice(0, 5)).toEqual(
        Array.from({ length: 5 }, () => fullScenario),
      );
      expect(decodedResponses[5]).toEqual({ scenario: fullScenario });
      expect(mockCreateTestScenario).toHaveBeenCalledWith({
        projectId,
        title: "Temporary MCP scenario",
        steps: [],
        createdById: userId,
      });
      expect(mockAppendScenarioStep).toHaveBeenCalledWith({ projectId, scenarioId, action: "Open" });
      expect(mockUpdateScenarioStep).toHaveBeenCalledWith({
        projectId,
        scenarioId,
        stepId: "44444444-4444-4444-8444-444444444444",
        expectedResult: null,
      });
      expect(mockReorderScenarioSteps).toHaveBeenCalledWith({ projectId, scenarioId, stepIds: [] });
      expect(mockDeleteScenarioStep).toHaveBeenCalledWith({
        projectId,
        scenarioId,
        stepId: "44444444-4444-4444-8444-444444444444",
      });
      expect(mockGetTestScenario).toHaveBeenCalledWith({
        scenarioId,
        projectId,
        resultPage: 1,
        resultLimit: 30,
        issuePage: 1,
        issueLimit: 30,
      });
    } finally {
      await client.close();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      delete process.env.MCP_SECRET;
    }
  });
});
