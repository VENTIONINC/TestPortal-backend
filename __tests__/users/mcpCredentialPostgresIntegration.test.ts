// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dbClient } from "@/prisma/client";
import { userService } from "@/services/userService";
import { userModel } from "@/models/userModel";
import express from "express";
import request from "supertest";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const describePostgres = process.env.RUN_POSTGRES_INTEGRATION_TESTS === "1" ? describe : describe.skip;
const ids: string[] = [];
const createUser = async (status: "active" | "pending" | "suspended", mcpToken: string | null) => {
  const id = randomUUID();
  ids.push(id);
  return dbClient.user.create({ data: { id, name: "MCP test", email: `${id}@example.test`, status, mcpToken } });
};

describePostgres("MCP credential PostgreSQL integration", () => {
  beforeAll(() => { process.env.MCP_SECRET = "postgres-integration-secret"; });
  afterAll(async () => {
    await dbClient.user.deleteMany({ where: { id: { in: ids } } });
    await dbClient.$disconnect();
    delete process.env.MCP_SECRET;
  });

  it("cleans inactive and empty credentials while preserving active credentials", async () => {
    const active = await createUser("active", `active-${randomUUID()}`);
    const pending = await createUser("pending", `pending-${randomUUID()}`);
    const suspended = await createUser("suspended", `suspended-${randomUUID()}`);
    const empty = await createUser("active", "");
    const absent = await createUser("active", null);
    const migration = readFileSync("prisma/migrations/20261104110000_clear_inactive_mcp_tokens/migration.sql", "utf8");
    await dbClient.$executeRawUnsafe(migration);
    const records = await dbClient.user.findMany({ where: { id: { in: ids } }, select: { id: true, mcpToken: true } });
    const credential = (id: string) => records.find((record) => record.id === id)?.mcpToken;
    expect(credential(active.id)).toBe(active.mcpToken);
    for (const user of [pending, suspended, empty, absent]) expect(credential(user.id)).toBeNull();
  });

  it("allows different users to revoke repeatedly without a unique constraint conflict", async () => {
    const first = await createUser("active", `first-${randomUUID()}`);
    const second = await createUser("active", `second-${randomUUID()}`);
    await userService.revokeMcpToken(first.id);
    await userService.revokeMcpToken(first.id);
    await userService.revokeMcpToken(second.id);
    const users = await dbClient.user.findMany({ where: { id: { in: [first.id, second.id] } } });
    expect(users).toHaveLength(2);
    expect(users.every((user) => user.mcpToken === null)).toBe(true);
  });

  it.each(["revoke", "replace", "suspend", "delete"] as const)("rejects %s credentials on all session requests and initialization", async (operation) => {
    const user = await createUser("active", null);
    const token = await userService.generateMcpToken(user.id);
    jest.useFakeTimers();
    const { default: router } = await import("@/mcp/server");
    jest.clearAllTimers();
    jest.useRealTimers();
    const app = express();
    app.use(express.json());
    app.use("/api", router);
    const transport = jest.spyOn(StreamableHTTPServerTransport.prototype, "handleRequest");
    const initialize = { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "1" } } };
    const init = await request(app).post("/api/v2/mcp").set("Accept", "application/json, text/event-stream").set("Authorization", `Bearer ${token}`).send(initialize);
    expect(init.status).toBe(200);
    const session = String(init.headers["mcp-session-id"]);
    expect(session).not.toBe("undefined");
    const callsAfterInit = transport.mock.calls.length;
    if (operation === "revoke") await userService.revokeMcpToken(user.id);
    if (operation === "replace") await userService.generateMcpToken(user.id);
    if (operation === "suspend") await userService.suspendUser(user.id);
    if (operation === "delete") await dbClient.user.delete({ where: { id: user.id } });
    const post = await request(app).post("/api/v2/mcp").set("Authorization", `Bearer ${token}`).set("mcp-session-id", session).send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    const get = await request(app).get("/api/v2/mcp").set("Authorization", `Bearer ${token}`).set("mcp-session-id", session);
    const del = await request(app).delete("/api/v2/mcp").set("Authorization", `Bearer ${token}`).set("mcp-session-id", session);
    const retry = await request(app).post("/api/v2/mcp").set("Authorization", `Bearer ${token}`).send(initialize);
    for (const response of [post, get, del, retry]) {
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe(-32002);
    }
    expect(transport).toHaveBeenCalledTimes(callsAfterInit);
    transport.mockRestore();
  });

  it("preserves session ownership across replacement and restoration", async () => {
    const owner = await createUser("active", null);
    const other = await createUser("active", null);
    const oldToken = await userService.generateMcpToken(owner.id);
    const otherToken = await userService.generateMcpToken(other.id);
    jest.useFakeTimers();
    const { default: router } = await import("@/mcp/server");
    jest.clearAllTimers();
    jest.useRealTimers();
    const app = express();
    app.use(express.json());
    app.use("/api", router);
    const init = await request(app).post("/api/v2/mcp").set("Accept", "application/json, text/event-stream").set("Authorization", `Bearer ${oldToken}`).send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "1" } } });
    expect(init.status).toBe(200);
    const session = String(init.headers["mcp-session-id"]);
    const send = (token: string) => request(app).post("/api/v2/mcp").set("Accept", "application/json, text/event-stream").set("Authorization", `Bearer ${token}`).set("mcp-session-id", session).send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    expect((await send(otherToken)).status).toBe(403);
    const replacement = await userService.generateMcpToken(owner.id);
    expect((await send(oldToken)).status).toBe(401);
    expect((await send(replacement)).status).toBe(200);
    await userService.suspendUser(owner.id);
    expect((await send(replacement)).status).toBe(401);
    await userService.restoreSuspendedUser(owner.id);
    expect((await send(replacement)).status).toBe(401);
    const fresh = await userService.generateMcpToken(owner.id);
    expect((await send(fresh)).status).toBe(200);
  });

  it("clears a credential when generation writes before suspension", async () => {
    const user = await createUser("active", null);
    let release!: () => void;
    let written!: () => void;
    const hold = new Promise<void>((resolve) => { release = resolve; });
    const ready = new Promise<void>((resolve) => { written = resolve; });
    const original = userModel.storeMcpTokenForActiveUser;
    const spy = jest.spyOn(userModel, "storeMcpTokenForActiveUser").mockImplementation(async (...args) => {
      const count = await original(...args);
      written();
      await hold;
      return count;
    });
    try {
      const generation = userService.generateMcpToken(user.id);
      await ready;
      await userService.suspendUser(user.id);
      release();
      const token = await generation;
      expect(await userService.validateMcpCredential(user.id, token)).toBe(false);
      expect(await dbClient.user.findUnique({ where: { id: user.id } })).toMatchObject({ status: "suspended", mcpToken: null });
    } finally { release(); spy.mockRestore(); }
  });

  it("rejects generation waiting on a suspension transaction", async () => {
    const user = await createUser("active", null);
    let release!: () => void;
    let written!: () => void;
    const hold = new Promise<void>((resolve) => { release = resolve; });
    const ready = new Promise<void>((resolve) => { written = resolve; });
    const original = userModel.update;
    const spy = jest.spyOn(userModel, "update").mockImplementation(async (...args) => {
      const result = await original(...args);
      written();
      await hold;
      return result;
    });
    try {
      const suspension = userService.suspendUser(user.id);
      await ready;
      const generation = userService.generateMcpToken(user.id);
      const outcome = generation.then(() => "success", () => "rejected");
      let blocked = false;
      for (let i = 0; i < 500 && !blocked; i++) {
        const rows = await dbClient.$queryRaw<Array<{ blocked: boolean }>>`SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%UPDATE%User%') AS blocked`;
        blocked = rows[0]?.blocked ?? false;
      }
      expect(blocked).toBe(true);
      release();
      await suspension;
      expect(await outcome).toBe("rejected");
      expect(await dbClient.user.findUnique({ where: { id: user.id } })).toMatchObject({ status: "suspended", mcpToken: null });
    } finally { release(); spy.mockRestore(); }
  });

  it("rolls back a failed suspension and does not report success", async () => {
    const user = await createUser("active", `before-${randomUUID()}`);
    const original = userModel.update;
    const spy = jest.spyOn(userModel, "update").mockImplementation(async (...args) => {
      await original(...args);
      throw new Error("forced transaction failure");
    });
    try {
      await expect(userService.suspendUser(user.id)).rejects.toThrow("forced transaction failure");
      expect(await dbClient.user.findUnique({ where: { id: user.id } })).toMatchObject({ status: "active", mcpToken: user.mcpToken });
    } finally { spy.mockRestore(); }
  });
});

