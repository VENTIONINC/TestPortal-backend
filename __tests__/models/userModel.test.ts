// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";
import { dbClient } from "@/prisma/client";
import { userModel } from "@/models/userModel";

jest.mock("@/prisma/client", () => ({
  dbClient: { user: { findUnique: jest.fn(), updateMany: jest.fn() } },
}));

it("selects only the current MCP credential by user ID", async () => {
  const findUnique = jest.mocked(dbClient.user.findUnique);
  findUnique.mockResolvedValueOnce({ mcpToken: "token" } as never);
  await expect(userModel.findMcpCredential("user-1")).resolves.toEqual({ mcpToken: "token" });
  expect(findUnique).toHaveBeenCalledWith({
    where: { id: "user-1" },
    select: { mcpToken: true },
  });
});

it("writes a credential only to an active user and returns the affected count", async () => {
  const updateMany = jest.mocked(dbClient.user.updateMany);
  updateMany.mockResolvedValueOnce({ count: 1 });
  await expect(userModel.storeMcpTokenForActiveUser("user-1", "token")).resolves.toBe(1);
  expect(updateMany).toHaveBeenCalledWith({ where: { id: "user-1", status: "active" }, data: { mcpToken: "token" } });
});

