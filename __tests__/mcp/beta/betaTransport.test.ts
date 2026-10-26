// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { createServer, request as httpRequest, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import cors from "cors";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { generateMcpToken } from "@/lib/mcp-token";
import betaMcp from "@/mcp/beta/server";
import { enforceMcpBetaOrigin, isMcpBetaPath } from "@/mcp/beta/originPolicy";

const secret = "mcp-beta-transport-test-secret";
const userId = "11111111-1111-1111-1111-111111111111";
const token = generateMcpToken(userId, secret);
const observedHeaders: Array<Record<string, string | string[] | undefined>> = [];
const app = express();
app.use((req, _res, next) => {
  observedHeaders.push({ ...req.headers });
  next();
});
app.use((req, res, next) => {
  if (isMcpBetaPath(req.path)) {
    enforceMcpBetaOrigin(req, res, next);
  } else {
    cors()(req, res, next);
  }
});
app.use((req, res, next) => {
  if (isMcpBetaPath(req.path)) {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use("/api", betaMcp);

let server: Server;
let endpoint: URL;

const createClient = (): Client =>
  new Client(
    { name: "beta-transport-test", version: "1.0.0" },
    { versionNegotiation: { mode: { pin: "2026-07-28" } } },
  );

beforeAll(async () => {
  process.env.MCP_SECRET = secret;
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  endpoint = new URL(`http://127.0.0.1:${address.port}/api/v2/mcp-beta`);
});

afterAll(async () => {
  delete process.env.MCP_SECRET;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe("MCP v2 beta minimal transport", () => {
  beforeEach(() => observedHeaders.splice(0, observedHeaders.length));

  it.each(["/api/v2/mcp-beta/", "/api/v2/MCP-BETA"])(
    "keeps origin and raw-body handling for path variant %s",
    async (path) => {
      const variantEndpoint = new URL(`${endpoint.origin}${path}`);
      const client = createClient();

      try {
        await client.connect(
          new StreamableHTTPClientTransport(variantEndpoint, {
            requestInit: { headers: { Authorization: `Bearer ${token}` } },
          }),
        );
        const status = await client.callTool({
          name: "check-status",
          arguments: {},
        });
        expect(status.isError).not.toBe(true);
      } finally {
        await client.close();
      }
    },
  );

  it.each(["/api/v2/mcp-beta/", "/api/v2/MCP-BETA"])(
    "rejects untrusted preflight origins for path variant %s",
    async (path) => {
      const variantEndpoint = new URL(`${endpoint.origin}${path}`);
      const response = await new Promise<{
        statusCode: number | undefined;
        origin: string | undefined;
      }>(
        (resolve, reject) => {
          const req = httpRequest(
            variantEndpoint,
            {
              method: "OPTIONS",
              headers: {
                Origin: "https://untrusted.example",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization, content-type",
              },
            },
            (res) =>
              resolve({
                statusCode: res.statusCode,
                origin: res.headers["access-control-allow-origin"],
              }),
          );
          req.on("error", reject);
          req.end();
        },
      );

      expect(response.statusCode).toBe(403);
      expect(response.origin).toBeUndefined();
    },
  );

  it("discovers, calls the harmless tool, lists and retrieves a prompt without sessions", async () => {
    const client = createClient();
    try {
      await client.connect(new StreamableHTTPClientTransport(endpoint, {
        requestInit: { headers: { Authorization: `Bearer ${token}` } },
      }));
      expect(client.getProtocolEra()).toBe("modern");

      const tools = await client.listTools();
      expect(tools.tools.map(({ name }) => name)).toContain("check-status");
      const status = await client.callTool({ name: "check-status", arguments: {} });
      expect(status.isError).not.toBe(true);

      const prompts = await client.listPrompts();
      expect(prompts.prompts.map(({ name }) => name)).toContain(
        "test-portal-report-generator",
      );
      const prompt = await client.getPrompt({
        name: "test-portal-report-generator",
        arguments: { time_period: "today", project_system: "jira" },
      });
      expect(prompt.messages.length).toBeGreaterThan(0);
      expect(observedHeaders.length).toBeGreaterThanOrEqual(4);
      expect(observedHeaders.every((headers) => !headers["mcp-session-id"])).toBe(
        true,
      );
    } finally {
      await client.close();
    }
  });

  it("rejects a client pinned to an unsupported protocol revision", async () => {
    const client = new Client(
      { name: "unsupported-revision-test", version: "1.0.0" },
      { versionNegotiation: { mode: { pin: "2026-01-01" } } },
    );
    const transport = new StreamableHTTPClientTransport(endpoint, {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    });

    await expect(client.connect(transport)).rejects.toThrow();
    expect(observedHeaders.every((headers) => !headers["mcp-session-id"])).toBe(
      true,
    );
    await client.close();
  });

  it("rejects legacy initialization without issuing a session header", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "legacy-test", version: "1.0.0" },
        },
      }),
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.headers.get("mcp-session-id")).toBeNull();
    expect(observedHeaders.every((headers) => !headers["mcp-session-id"])).toBe(
      true,
    );
  });

  it("authenticates discovery and fails closed when the MCP secret is missing", async () => {
    const missing = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(missing.status).toBe(401);

    const invalid = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: "Bearer invalid",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(invalid.status).toBe(401);

    delete process.env.MCP_SECRET;
    try {
      const unconfigured = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      });
      expect(unconfigured.status).toBe(500);
    } finally {
      process.env.MCP_SECRET = secret;
    }
  });

  it("enforces exact configured origins and answers allowed preflight", async () => {
    const allowedOrigin = "https://allowed.example.test";
    process.env.MCP_BETA_ALLOWED_ORIGINS = allowedOrigin;

    for (const origin of [
      "https://other.example.test",
      "null",
      "https://allowed.example.test/path",
    ]) {
      const rejected = await fetch(endpoint, {
        method: "POST",
        headers: { Origin: origin },
      });
      expect(rejected.status).toBe(403);
    }

    const emptyConfiguration = process.env.MCP_BETA_ALLOWED_ORIGINS;
    process.env.MCP_BETA_ALLOWED_ORIGINS = "";
    const rejectedWhenEmpty = await fetch(endpoint, {
      method: "POST",
      headers: { Origin: allowedOrigin },
    });
    expect(rejectedWhenEmpty.status).toBe(403);
    process.env.MCP_BETA_ALLOWED_ORIGINS = emptyConfiguration;

    const preflight = await fetch(endpoint, {
      method: "OPTIONS",
      headers: {
        Origin: allowedOrigin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers":
          "authorization,content-type,mcp-protocol-version,mcp-method,mcp-name",
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe(
      allowedOrigin,
    );
    expect(preflight.headers.get("access-control-allow-methods")).toContain(
      "POST",
    );
    expect(preflight.headers.get("access-control-allow-headers")).toContain(
      "mcp-protocol-version",
    );

    const allowedPostStillRequiresAuth = await fetch(endpoint, {
      method: "POST",
      headers: { Origin: allowedOrigin },
    });
    expect(allowedPostStillRequiresAuth.status).toBe(401);
    expect(
      allowedPostStillRequiresAuth.headers.get("access-control-allow-origin"),
    ).toBe(allowedOrigin);
    delete process.env.MCP_BETA_ALLOWED_ORIGINS;
  });

  it("rejects malformed and oversized transport bodies", async () => {
    const malformed = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{",
    });
    expect(malformed.status).toBeGreaterThanOrEqual(400);

    const oversizedStatus = await new Promise<number>((resolve, reject) => {
      const outgoing = httpRequest(
        endpoint,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Content-Length": String(4 * 1024 * 1024 + 1),
            Expect: "100-continue",
          },
        },
        (response) => {
          response.resume();
          resolve(response.statusCode ?? 0);
        },
      );
      outgoing.on("continue", () => {
        outgoing.end("x".repeat(4 * 1024 * 1024 + 1));
      });
      outgoing.on("error", reject);
      outgoing.flushHeaders();
    });
    expect(oversizedStatus).toBe(413);
  });

  it.each(["GET", "DELETE"] as const)("returns 405 for %s", async (method) => {
    const response = await fetch(endpoint, { method });
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toContain("POST");
  });
});
