// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

const mockStartRun = jest.fn();
const mockGetRun = jest.fn();
const mockUpdateRun = jest.fn();
const mockUpdateStep = jest.fn();
const mockCompleteRun = jest.fn();
const mockListRuns = jest.fn();
const mockReassignExecutor = jest.fn();
const mockListActiveDirectory = jest.fn();

jest.mock("@/services/manualTestRunService", () => ({ manualTestRunService: {
  startRun: mockStartRun, getRun: mockGetRun, updateRun: mockUpdateRun,
  updateStep: mockUpdateStep, completeRun: mockCompleteRun, listRuns: mockListRuns,
  reassignExecutor: mockReassignExecutor,
} }));
jest.mock("@/services/userService", () => ({ userService: { listActiveDirectory: mockListActiveDirectory } }));

describe("manual run MCP handler adapters", () => {
  beforeEach(() => jest.clearAllMocks());

  it("binds trusted executor identity and preserves explicitly supplied null environment/notes values", async () => {
    const { mcpManualTestRunHandler } = await import("@/handlers/mcpManualTestRunHandler");
    const params = { projectId: "p", scenarioId: "s", browser: null, notes: null };
    mockStartRun.mockResolvedValue({ id: "r" });
    await mcpManualTestRunHandler.start(params as never, "session-user");
    expect(mockStartRun).toHaveBeenCalledWith({ ...params, executedById: "session-user" });
    expect(mockStartRun.mock.calls[0]?.[0]).not.toHaveProperty("status");
  });

  it("delegates scoped operations, excludes run status and preserves omitted fields", async () => {
    const { mcpManualTestRunHandler } = await import("@/handlers/mcpManualTestRunHandler");
    const scope = { projectId: "p", runId: "r" };
    mockUpdateRun.mockResolvedValue({ id: "r" });
    await mcpManualTestRunHandler.update({ ...scope, runKey: null } as never);
    expect(mockUpdateRun).toHaveBeenCalledWith({ ...scope, runKey: null });
    await mcpManualTestRunHandler.updateStep({ ...scope, stepId: "st", status: "failed" } as never);
    expect(mockUpdateStep).toHaveBeenCalledWith({ ...scope, stepId: "st", status: "failed" });
    await mcpManualTestRunHandler.complete({ ...scope, status: "failed" } as never);
    expect(mockCompleteRun).toHaveBeenCalledWith({ ...scope, status: "failed" });
    mockGetRun.mockRejectedValue(new Error("conflict"));
    await expect(mcpManualTestRunHandler.get(scope as never)).rejects.toThrow("conflict");
    mockReassignExecutor.mockRejectedValue(new Error("Executor must be an active user"));
    await expect(mcpManualTestRunHandler.reassignExecutor({ ...scope, executedById: "u" } as never)).rejects.toThrow("Executor must be an active user");
  });

  it("maps both history forms and exposes only the service's safe active directory", async () => {
    const { mcpManualTestRunHandler } = await import("@/handlers/mcpManualTestRunHandler");
    const projectHistory = { projectId: "p", page: 2, limit: 10, status: "failed" };
    await mcpManualTestRunHandler.list(projectHistory as never);
    expect(mockListRuns).toHaveBeenCalledWith(projectHistory);
    const nested = { projectId: "p", scenarioId: "s", page: 1, limit: 30 };
    await mcpManualTestRunHandler.listForScenario(nested as never);
    expect(mockListRuns).toHaveBeenCalledWith(nested);
    const directory = [{ id: "u", name: "User", email: "u@example.test" }];
    mockListActiveDirectory.mockResolvedValue(directory);
    await expect(mcpManualTestRunHandler.listActiveUsers()).resolves.toEqual(directory);
    expect(mockListActiveDirectory).toHaveBeenCalledWith();
  });
});
