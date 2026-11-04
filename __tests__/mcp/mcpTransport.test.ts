// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import express from "express";
import request from "supertest";
import { generateMcpToken } from "@/lib/mcp-token";
import { authenticateMcpToken } from "@/mcp/middleware/auth";
import { userModel } from "@/models/userModel";
import { userService } from "@/services/userService";
import type { PrismaUser } from "@/types";

jest.mock("@/models/userModel");
const credentialLookup = jest.mocked(userModel.findMcpCredential);

const secret = "mcp-transport-test-secret";
const userId = "11111111-1111-1111-1111-111111111111";
const app = express();
const protectedHandler = jest.fn();
app.use(express.json());
app.post("/v2/mcp", authenticateMcpToken, (_req, res) => {
  protectedHandler();
  res.status(200).json({ ok: true });
});

describe("MCP authentication transport", () => {
  beforeEach(() => {
    jest.resetAllMocks();
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
        params: {
          name: "testportal-execute-action",
          arguments: {
            actionId: "testportal-list-test-scenarios",
            arguments: {},
          },
        },
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
    credentialLookup.mockResolvedValue({ mcpToken: token });
    const response = await request(app)
      .post("/v2/mcp")
      .set("Authorization", `Bearer ${token}`)
      .send({ jsonrpc: "2.0", id: 1, method: "tools/list" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it.each([null, { mcpToken: null }, { mcpToken: "" }, { mcpToken: "replacement" }])(
    "rejects a missing, revoked or replaced credential before dispatch",
    async (credential) => {
      credentialLookup.mockResolvedValue(credential);
      const response = await request(app).post("/v2/mcp")
        .set("Authorization", `Bearer ${generateMcpToken(userId, secret)}`).send({});
      expect(response.status).toBe(401);
      expect(response.body.error).toEqual({ code: -32002, message: "Invalid or expired MCP token" });
      expect(protectedHandler).not.toHaveBeenCalled();
    },
  );

  it("fails closed without disclosing store errors", async () => {
    credentialLookup.mockRejectedValue(new Error("private database details"));
    const response = await request(app).post("/v2/mcp")
      .set("Authorization", `Bearer ${generateMcpToken(userId, secret)}`).send({});
    expect(response.status).toBe(500);
    expect(response.body.error).toEqual({ code: -32603, message: "Internal server error" });
    expect(protectedHandler).not.toHaveBeenCalled();
  });

  it("rejects invalid signatures and expired tokens before looking up credentials", async () => {
    const expired = generateMcpToken(userId, secret);
    const clock = jest.spyOn(Date, "now").mockReturnValue(Date.now() + 31 * 24 * 60 * 60 * 1000);
    const badSignature = generateMcpToken(userId, "wrong-secret");
    for (const token of [expired, badSignature]) {
      const response = await request(app).post("/v2/mcp").set("Authorization", `Bearer ${token}`).send({});
      expect(response.status).toBe(401);
    }
    clock.mockRestore();
    expect(credentialLookup).not.toHaveBeenCalled();
    expect(protectedHandler).not.toHaveBeenCalled();
  });

  it("invalidates replaced and repeatedly revoked tokens through authentication", async () => {
    const credentials = new Map<string, string | null>();
    jest.mocked(userModel.findById).mockImplementation(async (id) => ({ id, status: "active" }) as PrismaUser);
    credentialLookup.mockImplementation(async (id) => credentials.has(id) ? { mcpToken: credentials.get(id) ?? null } : null);
    jest.mocked(userModel.storeMcpTokenForActiveUser).mockImplementation(async (id, token) => { credentials.set(id, token); return 1; });
    jest.mocked(userModel.update).mockImplementation(async (id, data) => { credentials.set(id, data.mcpToken ?? null); return { id } as PrismaUser; });
    const other = "22222222-2222-4222-8222-222222222222";
    const first = await userService.generateMcpToken(userId);
    const second = await userService.generateMcpToken(userId);
    const otherToken = await userService.generateMcpToken(other);
    const send = (token: string) => request(app).post("/v2/mcp").set("Authorization", `Bearer ${token}`).send({});
    expect((await send(first)).status).toBe(401);
    expect((await send(second)).status).toBe(200);
    await userService.revokeMcpToken(userId);
    await userService.revokeMcpToken(userId);
    await userService.revokeMcpToken(other);
    expect(credentials.get(userId)).toBeNull();
    expect(credentials.get(other)).toBeNull();
    expect((await send(second)).status).toBe(401);
    expect((await send(otherToken)).status).toBe(401);
  });
});
