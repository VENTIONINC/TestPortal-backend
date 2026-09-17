// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";

import * as mcpAuth from "@/mcp/middleware/auth";
import type { RequestWithMcpUser } from "@/mcp/middleware/auth";
import {
  createMockRequest,
  createMockResponse,
} from "@/test-utils/httpMocks";

describe("MCP session authorization", () => {
  const getSessionHandler = (): unknown =>
    Reflect.get(mcpAuth, "handleMcpSessionRequest");

  it("rejects session reuse by a different authenticated user without calling transport", async () => {
    const handleSession: unknown = getSessionHandler();
    expect(handleSession).toEqual(expect.any(Function));
    if (typeof handleSession !== "function") return;

    const req = createMockRequest() as RequestWithMcpUser;
    req.mcpUserId = "user-2";
    const res = createMockResponse();
    const handleTransport = jest.fn<() => Promise<void>>();

    await handleSession("user-1", req, res, handleTransport);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      jsonrpc: "2.0",
      error: {
        code: -32004,
        message: "MCP session belongs to a different user",
      },
      id: null,
    });
    expect(handleTransport).not.toHaveBeenCalled();
  });

  it("preserves normal session reuse for the authenticated session owner", async () => {
    const handleSession: unknown = getSessionHandler();
    expect(handleSession).toEqual(expect.any(Function));
    if (typeof handleSession !== "function") return;

    const req = createMockRequest() as RequestWithMcpUser;
    req.mcpUserId = "user-1";
    const res = createMockResponse();
    const handleTransport = jest.fn<() => Promise<void>>().mockResolvedValue();

    await handleSession("user-1", req, res, handleTransport);

    expect(res.headersSent).toBe(false);
    expect(handleTransport).toHaveBeenCalledTimes(1);
  });
});
