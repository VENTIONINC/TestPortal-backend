// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const mockScenario = jest.fn().mockResolvedValue({ id: "scenario" });
const mockProfile = jest.fn().mockResolvedValue({ id: "profile" });
const mockStart = jest.fn().mockResolvedValue({ id: "run" });
const mockAssumption = jest
  .fn()
  .mockResolvedValue({ action: "updated", assumption: { id: "assumption" } });
jest.mock("@/handlers/mcpTestScenarioHandler", () => ({
  mcpTestScenarioHandler: { createTestScenario: mockScenario },
}));
jest.mock("@/handlers/mcpManualRunEnvironmentProfileHandler", () => ({
  mcpManualRunEnvironmentProfileHandler: { create: mockProfile },
}));
jest.mock("@/handlers/mcpManualTestRunHandler", () => ({
  mcpManualTestRunHandler: { start: mockStart },
}));
jest.mock("@/handlers/mcpAssumptionHandler", () => ({
  mcpAssumptionHandler: { updateAssumption: mockAssumption },
}));

describe("session-bound action identity", () => {
  it("keeps creator, executor and reviewer attribution isolated between sessions", async () => {
    jest.useFakeTimers();
    const { registerActionTools } = await import("@/mcp/server");
    const projectId = "11111111-1111-4111-8111-111111111111";
    const scenarioId = "22222222-2222-4222-8222-222222222222";
    const actors = [
      "33333333-3333-4333-8333-333333333333",
      "44444444-4444-4444-8444-444444444444",
    ];
    const pairs = await Promise.all(
      actors.map(async (actor) => {
        const [clientTransport, serverTransport] =
          InMemoryTransport.createLinkedPair();
        const client = new Client({ name: "client", version: "1" });
        const server = new McpServer({ name: "server", version: "1" });
        registerActionTools(server, actor);
        await Promise.all([
          server.connect(serverTransport),
          client.connect(clientTransport),
        ]);
        return { client, server };
      }),
    );
    try {
      for (const [index, { client }] of pairs.entries()) {
        const actor = actors[index];
        const call = (actionId: string, args: object) =>
          client.callTool({
            name: "testportal-execute-action",
            arguments: { actionId, arguments: args },
          });
        expect(
          (
            await call("testportal-create-test-scenario", {
              projectId,
              title: "Case",
            })
          ).isError,
        ).not.toBe(true);
        expect(mockScenario).toHaveBeenLastCalledWith(
          expect.objectContaining({ createdById: actor }),
        );
        expect(
          (
            await call("testportal-create-manual-run-environment-profile", {
              projectId,
              name: "Profile",
            })
          ).isError,
        ).not.toBe(true);
        expect(mockProfile).toHaveBeenLastCalledWith(
          expect.objectContaining({ projectId }),
          actor,
        );
        expect(
          (
            await call("testportal-start-manual-test-run", {
              projectId,
              scenarioId,
            })
          ).isError,
        ).not.toBe(true);
        expect(mockStart).toHaveBeenLastCalledWith(
          expect.objectContaining({ projectId, scenarioId }),
          actor,
        );
        expect(
          (
            await call("testportal-update-assumption", {
              assumptionId: "a",
              madeBy: "user",
              reviewedById: "spoof",
            })
          ).isError,
        ).not.toBe(true);
        expect(mockAssumption).toHaveBeenLastCalledWith(
          "a",
          { madeBy: "user" },
          actor,
        );
        expect(
          (
            await call("testportal-create-test-scenario", {
              projectId,
              title: "Case",
              createdById: "spoof",
            })
          ).isError,
        ).toBe(true);
        expect(
          (
            await call("testportal-create-manual-run-environment-profile", {
              projectId,
              name: "Profile",
              ownerId: "spoof",
            })
          ).isError,
        ).toBe(true);
        expect(
          (
            await call("testportal-start-manual-test-run", {
              projectId,
              scenarioId,
              executedById: "spoof",
            })
          ).isError,
        ).toBe(true);
      }
      expect(mockScenario).toHaveBeenCalledTimes(2);
      expect(mockProfile).toHaveBeenCalledTimes(2);
      expect(mockStart).toHaveBeenCalledTimes(2);
    } finally {
      await Promise.all(
        pairs.flatMap(({ client, server }) => [client.close(), server.close()]),
      );
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });
});
