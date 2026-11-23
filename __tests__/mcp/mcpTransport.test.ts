// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import express from "express";
import request from "supertest";
import { generateMcpToken } from "@/lib/mcp-token";
import { authenticateMcpToken } from "@/mcp/middleware/auth";

const secret = "mcp-transport-test-secret";
const userId = "11111111-1111-1111-1111-111111111111";
const app = express();
app.use(express.json());
app.post("/v2/mcp", authenticateMcpToken, (_req, res) =>
  res.status(200).json({ ok: true }),
);

describe("MCP authentication transport", () => {
  beforeEach(() => {
    process.env.MCP_SECRET = secret;
  });

  afterAll(() => {
    delete process.env.MCP_SECRET;
  });

  it("rejects an unauthenticated Test Scenario transport request", async () => {
    const response = await request(app)
      .post("/v2/mcp")
      .send({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "list-test-scenarios", arguments: {} },
      });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      jsonrpc: "2.0",
      error: {
        code: -32001,
      },
      id: null,
    });
  });

  it("passes a valid MCP token to the existing transport handler", async () => {
    const token = generateMcpToken(userId, secret);
    const response = await request(app)
      .post("/v2/mcp")
      .set("Authorization", `Bearer ${token}`)
      .send({ jsonrpc: "2.0", id: 1, method: "tools/list" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});
