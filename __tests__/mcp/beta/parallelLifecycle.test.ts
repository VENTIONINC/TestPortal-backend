// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import cors from "cors";
import express from "express";
import { Client as V1Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport as V1Transport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  Client as V2Client,
  StreamableHTTPClientTransport as V2Transport,
} from "@modelcontextprotocol/client";
import { generateMcpToken } from "@/lib/mcp-token";
import legacyMcp from "@/mcp/server";
import betaMcp from "@/mcp/beta/server";
import { enforceMcpBetaOrigin } from "@/mcp/beta/originPolicy";
import { closeMcpBetaHandlers } from "@/mcp/beta/server";
import { statusCheck } from "@/mcp/tools/status-check";
import { mcpAssumptionHandler } from "@/handlers/mcpAssumptionHandler";
import { mcpTestScenarioHandler } from "@/handlers/mcpTestScenarioHandler";

const secret = "mcp-parallel-lifecycle-test-secret";
const ownerId = "11111111-1111-1111-1111-111111111111";
const otherUserId = "22222222-2222-2222-2222-222222222222";
const ownerToken = generateMcpToken(ownerId, secret);
const otherUserToken = generateMcpToken(otherUserId, secret);
const activeServers = new Set<Server>();

const createApplication = (): express.Express => {
  const app = express();
  app.use((req, res, next) => {
    if (req.path === "/api/v2/mcp-beta") {
      enforceMcpBetaOrigin(req, res, next);
    } else {
      cors()(req, res, next);
    }
  });
  app.use((req, res, next) => {
    if (req.path === "/api/v2/mcp-beta") {
      next();
    } else {
      express.json()(req, res, next);
    }
  });
  app.use("/api", legacyMcp);
  app.use("/api", betaMcp);
  return app;
};

const listen = async (): Promise<{ server: Server; endpoint: URL }> => {
  const server = createServer(createApplication());
  activeServers.add(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  return {
    server,
    endpoint: new URL(`http://127.0.0.1:${address.port}/api/v2/mcp-beta`),
  };
};

const closeServer = async (server: Server): Promise<void> => {
  if (!server.listening) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  activeServers.delete(server);
};

const legacyEndpoint = (betaEndpoint: URL): URL => {
  const legacyUrl = new URL(betaEndpoint);
  legacyUrl.pathname = "/api/v2/mcp";
  return legacyUrl;
};

const normalizeSchema = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeSchema);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "$schema")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, normalizeSchema(child)]),
  );
};

beforeAll(() => {
  process.env.MCP_SECRET = secret;
  delete process.env.MCP_BETA_ALLOWED_ORIGINS;
});

afterAll(async () => {
  delete process.env.MCP_SECRET;
  await Promise.all([...activeServers].map(closeServer));
});

describe("parallel MCP routes and stateless beta lifecycle", () => {
  it("preserves the registered v1 tool and prompt catalogs and input contracts in beta", async () => {
    const { server, endpoint } = await listen();
    const legacyClient = new V1Client({
      name: "legacy-catalog",
      version: "1.0.0",
    });
    const legacyTransport = new V1Transport(legacyEndpoint(endpoint), {
      requestInit: { headers: { Authorization: `Bearer ${ownerToken}` } },
    });
    const betaClient = new V2Client(
      { name: "beta-catalog", version: "1.0.0" },
      { versionNegotiation: { mode: { pin: "2026-07-28" } } },
    );
    const betaTransport = new V2Transport(endpoint, {
      requestInit: { headers: { Authorization: `Bearer ${ownerToken}` } },
    });

    try {
      await legacyClient.connect(
        legacyTransport as unknown as Parameters<
          typeof legacyClient.connect
        >[0],
      );
      await betaClient.connect(betaTransport);

      const [legacyTools, betaTools, legacyPrompts, betaPrompts] =
        await Promise.all([
          legacyClient.listTools(),
          betaClient.listTools(),
          legacyClient.listPrompts(),
          betaClient.listPrompts(),
        ]);

      expect(betaTools.tools.map(({ name }) => name).sort()).toEqual(
        legacyTools.tools.map(({ name }) => name).sort(),
      );
      expect(betaTools.tools).toHaveLength(22);
      for (const legacyTool of legacyTools.tools) {
        const betaTool = betaTools.tools.find(
          ({ name }) => name === legacyTool.name,
        );
        expect(betaTool).toBeDefined();
        expect(normalizeSchema(betaTool?.inputSchema)).toEqual(
          normalizeSchema(legacyTool.inputSchema),
        );
      }

      const invalidStrictInput = await legacyClient.callTool({
        name: "update-test-scenario",
        arguments: {
          scenarioId: "33333333-3333-3333-3333-333333333333",
          projectId: "44444444-4444-4444-4444-444444444444",
          title: "Valid field",
          unexpected: true,
        },
      });
      expect(invalidStrictInput.isError).toBe(true);

      const invalidRefinementInput = await legacyClient.callTool({
        name: "update-test-scenario",
        arguments: {
          scenarioId: "33333333-3333-3333-3333-333333333333",
          projectId: "44444444-4444-4444-4444-444444444444",
        },
      });
      expect(invalidRefinementInput.isError).toBe(true);

      expect(betaPrompts.prompts.map(({ name }) => name).sort()).toEqual(
        legacyPrompts.prompts.map(({ name }) => name).sort(),
      );
      expect(betaPrompts.prompts).toHaveLength(5);
      const promptInputs: Record<string, Record<string, string>> = {
        "test-portal-report-generator": {
          time_period: "today",
          project_system: "jira",
        },
        "issue-analysis-assistant": {
          analysis_scope: "recent executions",
        },
        "environment-performance-assistant": {
          environment_scope: "all environments",
        },
        "developer-code-assistant": {},
        "software-documentation-assistant": {},
      };
      for (const legacyPrompt of legacyPrompts.prompts) {
        const betaPrompt = betaPrompts.prompts.find(
          ({ name }) => name === legacyPrompt.name,
        );
        expect(betaPrompt).toBeDefined();
        expect(normalizeSchema(betaPrompt?.arguments)).toEqual(
          normalizeSchema(legacyPrompt.arguments),
        );
        const args = promptInputs[legacyPrompt.name];
        expect(args).toBeDefined();
        const [legacyContent, betaContent] = await Promise.all([
          legacyClient.getPrompt({ name: legacyPrompt.name, arguments: args }),
          betaClient.getPrompt({ name: legacyPrompt.name, arguments: args }),
        ]);
        expect(betaContent.messages).toEqual(legacyContent.messages);
      }
    } finally {
      await Promise.all([legacyClient.close(), betaClient.close()]);
      await closeServer(server);
    }
  });

  it("binds concurrent update-assumption calls to each request's authenticated user", async () => {
    const { server, endpoint } = await listen();
    const reviewerA = "33333333-3333-3333-3333-333333333333";
    const reviewerB = "44444444-4444-4444-4444-444444444444";
    const tokenA = generateMcpToken(reviewerA, secret);
    const tokenB = generateMcpToken(reviewerB, secret);
    const updateAssumption = jest
      .spyOn(mcpAssumptionHandler, "updateAssumption")
      .mockImplementation(
        async (assumptionId) =>
          ({
            action: "updated",
            assumption: { id: assumptionId, isConfirmed: true },
          }) as never,
      );

    const createActorClient = (token: string, marker: string) => {
      const client = new V2Client(
        { name: `forged-client-actor-${marker}`, version: "1.0.0" },
        { versionNegotiation: { mode: { pin: "2026-07-28" } } },
      );
      const transport = new V2Transport(endpoint, {
        requestInit: { headers: { Authorization: `Bearer ${token}` } },
        fetch: async (input, init) => {
          if (init?.method === "POST" && typeof init.body === "string") {
            const request = JSON.parse(init.body) as {
              method?: string;
              params?: Record<string, unknown>;
            };
            if (request.method === "tools/call") {
              const headers = new Headers(init.headers);
              headers.set("Mcp-Session-Id", "forged-shared-session");
              request.params = {
                ...request.params,
                _meta: {
                  ...(request.params?._meta as
                    | Record<string, unknown>
                    | undefined),
                  reviewedById: "forged-client-metadata-actor",
                },
              };
              return fetch(input, {
                ...init,
                headers,
                body: JSON.stringify(request),
              });
            }
          }
          return fetch(input, init);
        },
      });
      return { client, transport };
    };
    const actorA = createActorClient(tokenA, "a");
    const actorB = createActorClient(tokenB, "b");

    try {
      await Promise.all([
        actorA.client.connect(actorA.transport),
        actorB.client.connect(actorB.transport),
      ]);
      const [responseA, responseB] = await Promise.all([
        actorA.client.callTool({
          name: "update-assumption",
          arguments: {
            assumptionId: "assumption-a",
            madeBy: "forged-argument-actor",
            isConfirmed: true,
          },
        }),
        actorB.client.callTool({
          name: "update-assumption",
          arguments: {
            assumptionId: "assumption-b",
            madeBy: "forged-argument-actor",
            isConfirmed: true,
          },
        }),
      ]);
      expect(responseA.isError).not.toBe(true);
      expect(responseB.isError).not.toBe(true);

      const reviewersByAssumption = new Map(
        updateAssumption.mock.calls.map(
          ([assumptionId, _changes, reviewedById]) => [
            assumptionId,
            reviewedById,
          ],
        ),
      );
      expect(reviewersByAssumption).toEqual(
        new Map([
          ["assumption-a", reviewerA],
          ["assumption-b", reviewerB],
        ]),
      );
      expect(
        updateAssumption.mock.calls.every(
          ([, changes]) => changes.madeBy === "forged-argument-actor",
        ),
      ).toBe(true);

      const followUp = await actorB.client.callTool({
        name: "update-assumption",
        arguments: {
          assumptionId: "assumption-b-follow-up",
          madeBy: "forged-argument-actor",
          isConfirmed: true,
        },
      });
      expect(followUp.isError).not.toBe(true);
      expect(updateAssumption.mock.calls.at(-1)?.[2]).toBe(reviewerB);
    } finally {
      updateAssumption.mockRestore();
      await Promise.all([actorA.client.close(), actorB.client.close()]);
      await closeServer(server);
    }
  });

  it("applies scenario pagination defaults and preserves validation and scoped service errors", async () => {
    const { server, endpoint } = await listen();
    const listScenarios = jest
      .spyOn(mcpTestScenarioHandler, "listTestScenarios")
      .mockResolvedValue({
        scenarios: [],
        total: 0,
        page: 1,
        limit: 30,
        totalPages: 0,
      });
    const updateScenario = jest.spyOn(
      mcpTestScenarioHandler,
      "updateTestScenario",
    );
    const getScenario = jest
      .spyOn(mcpTestScenarioHandler, "getTestScenario")
      .mockRejectedValue(new Error("Test Scenario not found in this project"));
    const client = new V2Client(
      { name: "scenario-contract-test", version: "1.0.0" },
      { versionNegotiation: { mode: { pin: "2026-07-28" } } },
    );

    try {
      await client.connect(
        new V2Transport(endpoint, {
          requestInit: { headers: { Authorization: `Bearer ${ownerToken}` } },
        }),
      );

      const listResult = await client.callTool({
        name: "list-test-scenarios",
        arguments: { projectId: "33333333-3333-3333-3333-333333333333" },
      });
      expect(listResult.isError).not.toBe(true);
      expect(listScenarios).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 30 }),
      );

      const rejectedUpdate = await client.callTool({
        name: "update-test-scenario",
        arguments: {
          scenarioId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          projectId: "33333333-3333-3333-3333-333333333333",
        },
      });
      expect(rejectedUpdate.isError).toBe(true);
      expect(rejectedUpdate.content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "text",
            text: expect.stringContaining(
              "At least one editable field is required",
            ),
          }),
        ]),
      );
      expect(updateScenario).not.toHaveBeenCalled();

      const scopedRead = await client.callTool({
        name: "get-test-scenario",
        arguments: {
          scenarioId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          projectId: "44444444-4444-4444-4444-444444444444",
        },
      });
      expect(scopedRead.isError).toBe(true);
      expect(getScenario).toHaveBeenCalledWith(
        expect.objectContaining({
          scenarioId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          projectId: "44444444-4444-4444-4444-444444444444",
          resultPage: 1,
          resultLimit: 30,
          issuePage: 1,
          issueLimit: 30,
        }),
      );
    } finally {
      listScenarios.mockRestore();
      updateScenario.mockRestore();
      getScenario.mockRestore();
      await client.close();
      await closeServer(server);
    }
  });

  it("reuses an authenticated v1 session while modern beta calls run, preserving legacy ownership and methods", async () => {
    const { server, endpoint } = await listen();
    const legacyClient = new V1Client({
      name: "legacy-regression",
      version: "1.0.0",
    });
    const legacyTransport = new V1Transport(legacyEndpoint(endpoint), {
      requestInit: { headers: { Authorization: `Bearer ${ownerToken}` } },
      // Let this test exercise the endpoint's GET route directly after the v1
      // client has established and reused its HTTP session.
      fetch: async (input, init) =>
        init?.method === "GET"
          ? new Response(null, { status: 405 })
          : fetch(input, init),
    });
    const betaClient = new V2Client(
      { name: "parallel-lifecycle-test", version: "1.0.0" },
      { versionNegotiation: { mode: { pin: "2026-07-28" } } },
    );

    try {
      await legacyClient.connect(
        legacyTransport as unknown as Parameters<
          typeof legacyClient.connect
        >[0],
      );
      const sessionId = legacyTransport.sessionId;
      expect(sessionId).toEqual(expect.any(String));

      const betaTransport = new V2Transport(endpoint, {
        requestInit: { headers: { Authorization: `Bearer ${ownerToken}` } },
      });
      await betaClient.connect(betaTransport);

      const modernRequestOnLegacy = await fetch(legacyEndpoint(endpoint), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          "Content-Type": "application/json",
          "Mcp-Protocol-Version": "2026-07-28",
          "Mcp-Method": "server/discover",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 7,
          method: "server/discover",
          params: {},
        }),
      });
      expect(modernRequestOnLegacy.status).toBe(400);
      expect(modernRequestOnLegacy.redirected).toBe(false);
      expect(modernRequestOnLegacy.headers.get("mcp-session-id")).toBeNull();

      const [legacyFirst, betaResult] = await Promise.all([
        legacyClient.callTool({ name: "check-status", arguments: {} }),
        betaClient.callTool({ name: "check-status", arguments: {} }),
      ]);
      expect(legacyFirst.isError).not.toBe(true);
      expect(betaResult.isError).not.toBe(true);
      expect(legacyTransport.sessionId).toBe(sessionId);

      const crossUserPost = await fetch(legacyEndpoint(endpoint), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${otherUserToken}`,
          "Content-Type": "application/json",
          "Mcp-Session-Id": sessionId as string,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 8,
          method: "tools/list",
          params: {},
        }),
      });
      expect(crossUserPost.status).toBe(403);

      const crossUserGet = await fetch(legacyEndpoint(endpoint), {
        headers: {
          Authorization: `Bearer ${otherUserToken}`,
          "Mcp-Session-Id": sessionId as string,
          Accept: "text/event-stream",
        },
      });
      expect(crossUserGet.status).toBe(403);

      const crossUserDelete = await fetch(legacyEndpoint(endpoint), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${otherUserToken}`,
          "Mcp-Session-Id": sessionId as string,
        },
      });
      expect(crossUserDelete.status).toBe(403);

      await legacyClient.close();
      const ownerGetController = new AbortController();
      const ownerGet = await fetch(legacyEndpoint(endpoint), {
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          "Mcp-Session-Id": sessionId as string,
          Accept: "text/event-stream",
        },
        signal: ownerGetController.signal,
      });
      expect(ownerGet.status).toBe(200);
      ownerGetController.abort();
      await ownerGet.body?.cancel().catch(() => undefined);

      const ownerDelete = await fetch(legacyEndpoint(endpoint), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${ownerToken}`,
          "Mcp-Session-Id": sessionId as string,
        },
      });
      expect(ownerDelete.status).toBe(200);

      const betaAfterLegacyDelete = await betaClient.callTool({
        name: "check-status",
        arguments: {},
      });
      expect(betaAfterLegacyDelete.isError).not.toBe(true);
    } finally {
      await Promise.all([legacyClient.close(), betaClient.close()]);
      await closeServer(server);
    }
  });

  it("serves a call on an independent and recreated beta application after discovery on another instance", async () => {
    const first = await listen();
    const second = await listen();
    const requests: Array<{ headers: Headers; body: string }> = [];
    const client = new V2Client(
      { name: "independent-instance-test", version: "1.0.0" },
      { versionNegotiation: { mode: { pin: "2026-07-28" } } },
    );
    const transport = new V2Transport(first.endpoint, {
      requestInit: { headers: { Authorization: `Bearer ${ownerToken}` } },
      fetch: async (input, init) => {
        if (init?.method === "POST" && typeof init.body === "string") {
          const body = JSON.parse(init.body) as { method?: string };
          if (body.method === "tools/call") {
            requests.push({
              headers: new Headers(init.headers),
              body: init.body,
            });
          }
        }
        return fetch(input, init);
      },
    });

    try {
      await client.connect(transport);
      const discovery = await client.listTools();
      expect(discovery.tools.map(({ name }) => name)).toContain("check-status");
      const firstCall = await client.callTool({
        name: "check-status",
        arguments: {},
      });
      expect(firstCall.isError).not.toBe(true);
      expect(requests).toHaveLength(1);
      expect(requests[0]?.headers.has("mcp-session-id")).toBe(false);

      const replayOn = async (
        endpoint: URL,
      ): Promise<Record<string, unknown>> => {
        const captured = requests[0];
        if (!captured) throw new Error("No modern tool request was captured");
        const response = await fetch(endpoint, {
          method: "POST",
          headers: captured.headers,
          body: captured.body,
        });
        expect(response.status).toBe(200);
        return (await response.json()) as Record<string, unknown>;
      };

      const secondResult = await replayOn(second.endpoint);
      expect(secondResult).toHaveProperty("result");

      await closeServer(second.server);
      const recreated = await listen();
      try {
        const recreatedResult = await replayOn(recreated.endpoint);
        expect(recreatedResult).toHaveProperty("result");
      } finally {
        await closeServer(recreated.server);
      }
    } finally {
      await client.close();
      await Promise.all([
        closeServer(first.server),
        closeServer(second.server),
      ]);
    }
  });

  it("closes an in-flight beta request on shutdown without affecting a legacy session", async () => {
    const { server, endpoint } = await listen();
    const legacyClient = new V1Client({
      name: "shutdown-legacy",
      version: "1.0.0",
    });
    const legacyTransport = new V1Transport(legacyEndpoint(endpoint), {
      requestInit: { headers: { Authorization: `Bearer ${ownerToken}` } },
      fetch: async (input, init) =>
        init?.method === "GET"
          ? new Response(null, { status: 405 })
          : fetch(input, init),
    });
    const betaClient = new V2Client(
      { name: "shutdown-beta", version: "1.0.0" },
      { versionNegotiation: { mode: { pin: "2026-07-28" } } },
    );
    const betaTransport = new V2Transport(endpoint, {
      requestInit: { headers: { Authorization: `Bearer ${ownerToken}` } },
    });
    const statusHandlers = statusCheck as unknown as {
      3: (typeof statusCheck)[3];
    };
    const originalStatusHandler = statusHandlers[3];
    let announceStarted: () => void = () => undefined;
    let releaseHandler: () => void = () => undefined;
    const started = new Promise<void>((resolve) => {
      announceStarted = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      releaseHandler = resolve;
    });

    try {
      await legacyClient.connect(
        legacyTransport as unknown as Parameters<
          typeof legacyClient.connect
        >[0],
      );
      await betaClient.connect(betaTransport);
      statusHandlers[3] = async (input) => {
        announceStarted();
        await gate;
        return originalStatusHandler(input);
      };

      const betaCall = betaClient.callTool({
        name: "check-status",
        arguments: {},
      });
      await started;
      await closeMcpBetaHandlers();
      releaseHandler();
      await betaCall.catch(() => undefined);

      statusHandlers[3] = originalStatusHandler;
      const legacyResult = await legacyClient.callTool({
        name: "check-status",
        arguments: {},
      });
      expect(legacyResult.isError).not.toBe(true);
    } finally {
      statusHandlers[3] = originalStatusHandler;
      releaseHandler();
      await Promise.all([legacyClient.close(), betaClient.close()]);
      await closeServer(server);
    }
  });
});
