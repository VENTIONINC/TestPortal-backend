// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { dbClient } from "@/prisma/client";
import { generateMcpToken } from "@/lib/mcp-token";
import { projectModel } from "@/models/projectModel";
import { testScenarioModel } from "@/models/testScenarioModel";
import { manualTestRunModel } from "@/models/manualTestRunModel";
import { manualTestRunService } from "@/services/manualTestRunService";
import { manualRunEnvironmentProfileService } from "@/services/manualRunEnvironmentProfileService";
import { mcpManualTestRunHandler } from "@/handlers/mcpManualTestRunHandler";
import { mcpManualRunEnvironmentProfileHandler as profiles } from "@/handlers/mcpManualRunEnvironmentProfileHandler";
import { startManualTestRunSchema, updateManualTestRunSchema } from "@/mcp/schemas/manualTestRunSchemas";
import type { TestScenarioResponse } from "@/types/testScenarios";
import type { ManualTestRunResponse } from "@/types/manualTestRuns";

const enabled = process.env.RUN_POSTGRES_INTEGRATION_TESTS === "1";
const describePostgres = enabled ? describe : describe.skip;
const databaseUrl = process.env.DATABASE_URL ?? "";
const userId = randomUUID();
const projectId = randomUUID();

async function createScenario(
  steps: Array<{ action: string; expectedResult?: string }> = [
    { action: "Open login", expectedResult: "Login form" },
    { action: "Submit credentials", expectedResult: "Dashboard" },
  ],
  createdById = userId,
): Promise<TestScenarioResponse> {
  const scenario = await testScenarioModel.create({
    projectId,
    createdById,
    title: `Manual run scenario ${randomUUID()}`,
    details: "Verify a manual run",
    steps,
  });
  if (!scenario) {
    throw new Error("Failed to create integration scenario");
  }
  return scenario;
}

async function startRun(
  scenario: TestScenarioResponse,
  executedById = userId,
): Promise<ManualTestRunResponse> {
  const run = await manualTestRunModel.createFromScenario({
    projectId,
    scenarioId: scenario.id,
    executedById,
  });
  if (!run) {
    throw new Error("Failed to start integration manual run");
  }
  return run;
}

describePostgres("manual test run PostgreSQL integration", () => {
  beforeAll(async () => {
    if (!databaseUrl.startsWith("postgresql://")) {
      throw new Error(
        "RUN_POSTGRES_INTEGRATION_TESTS=1 requires a PostgreSQL DATABASE_URL",
      );
    }
    await dbClient.user.create({
      data: {
        id: userId,
        name: "Manual Run Integration User",
        email: `manual-run-${userId}@example.test`,
      },
    });
    await dbClient.project.create({
      data: {
        id: projectId,
        name: `Manual Run Integration Project ${projectId}`,
        ownerId: userId,
      },
    });
  });

  beforeEach(async () => {
    await dbClient.manualTestRun.deleteMany({ where: { projectId } });
    await dbClient.testScenario.deleteMany({ where: { projectId } });
    await dbClient.manualRunEnvironmentProfile.deleteMany({ where: { projectId } });
  });

  afterAll(async () => {
    await dbClient.manualTestRun.deleteMany({ where: { projectId } });
    await dbClient.testScenario.deleteMany({ where: { projectId } });
    await dbClient.manualRunEnvironmentProfile.deleteMany({ where: { projectId } });
    await dbClient.project.deleteMany({ where: { id: projectId } });
    await dbClient.user.deleteMany({ where: { id: userId } });
    await dbClient.$disconnect();
  });

  it("preserves scenario, profile and run invariants through the public action interface", async () => {
    const secret = "action-workflow-integration-secret";
    const previousSecret = process.env.MCP_SECRET;
    process.env.MCP_SECRET = secret;
    jest.useFakeTimers();
    const { default: router } = await import("@/mcp/server");
    jest.clearAllTimers();
    jest.useRealTimers();
    const app = express();
    app.use(express.json());
    app.use("/api", router);
    const server = createServer(app);
    const client = new Client({ name: "action-workflow", version: "1" });
    const foreignProject = randomUUID();
    try {
      await dbClient.project.create({
        data: { id: foreignProject, name: "Foreign", ownerId: userId },
      });
      await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve),
      );
      const address = server.address() as AddressInfo;
      await client.connect(
        new StreamableHTTPClientTransport(
          new URL(`http://127.0.0.1:${address.port}/api/v2/mcp`),
          {
            requestInit: {
              headers: {
                Authorization: `Bearer ${generateMcpToken(userId, secret)}`,
              },
            },
          },
        ),
      );
      let executeCalls = 0;
      let discoveryCalls = 0;
      const discoveryBytes: number[] = [];
      const call = async (actionId: string, args: object) => {
        executeCalls += 1;
        return client.callTool({
          name: "testportal-execute-action",
          arguments: { actionId, arguments: args },
        });
      };
      const data = (response: Awaited<ReturnType<typeof call>>) => {
        expect(response.isError).not.toBe(true);
        const content = response.content[0];
        if (!content || content.type !== "text")
          throw new Error("Expected JSON text");
        return JSON.parse(content.text);
      };
      const find = async (query: string, area: "core" | "tms") => {
        const response = await client.callTool({
          name: "testportal-find-action",
          arguments: { query, area, limit: 5 },
        });
        discoveryCalls += 1;
        discoveryBytes.push(Buffer.byteLength(JSON.stringify(response)));
        return data(response).actions as Array<{ actionId: string }>;
      };
      const execution = await dbClient.execution.create({
        data: {
          projectId,
          name: "Action failure",
          type: "test",
          environment: "test",
          version: "1",
          startedAt: new Date(),
        },
      });
      const spec = await dbClient.spec.create({
        data: {
          projectId,
          key: randomUUID(),
          file: "checkout.spec.ts",
          title: "Checkout",
        },
      });
      const failure = await dbClient.result.create({
        data: {
          specId: spec.id,
          executionId: execution.id,
          retry: 0,
          status: "failed",
          duration: 1,
          startTime: new Date(),
        },
      });
      const error = await dbClient.resultError.create({
        data: {
          resultId: failure.id,
          type: "AssertionError",
          message: "Expected checkout",
          callStack: [],
          location: "checkout.spec.ts",
        },
      });
      expect(
        (await find("get results", "core")).map(({ actionId }) => actionId),
      ).toContain("testportal-get-results");
      expect(
        JSON.stringify(
          data(
            await call("testportal-get-results", {
              projectId,
              status: "failed",
            }),
          ),
        ),
      ).toContain(failure.id);
      expect(
        JSON.stringify(
          data(
            await call("testportal-get-result-error-by-id", {
              projectId,
              resultErrorId: error.id,
            }),
          ),
        ),
      ).toContain("Expected checkout");
      expect(
        (await find("append test scenario step", "tms")).map(
          ({ actionId }) => actionId,
        ),
      ).toContain("testportal-append-test-scenario-step");
      expect(
        (await find("manual step outcome", "tms")).map(
          ({ actionId }) => actionId,
        ),
      ).toContain("testportal-update-manual-test-run-step");
      expect(
        (
          await client.callTool({
            name: "testportal-get-results",
            arguments: { projectId },
          })
        ).isError,
      ).toBe(true);
      const scenario = data(
        await call("testportal-create-test-scenario", {
          projectId,
          title: "Action workflow",
        }),
      );
      const edited = data(
        await call("testportal-append-test-scenario-step", {
          projectId,
          scenarioId: scenario.id,
          action: "Open",
        }),
      );
      expect(edited.steps).toHaveLength(1);
      expect(
        (
          await call("testportal-get-test-scenario", {
            projectId: foreignProject,
            scenarioId: scenario.id,
          })
        ).isError,
      ).toBe(true);
      const profile = data(
        await call("testportal-create-manual-run-environment-profile", {
          projectId,
          name: "Environment",
          browser: "Chrome",
          device: "Laptop",
        }),
      );
      expect(
        (
          await call("testportal-start-manual-test-run", {
            projectId: foreignProject,
            scenarioId: scenario.id,
            environmentProfileId: profile.id,
          })
        ).isError,
      ).toBe(true);
      const run = data(
        await call("testportal-start-manual-test-run", {
          projectId,
          scenarioId: scenario.id,
          environmentProfileId: profile.id,
          device: null,
        }),
      );
      expect(run).toMatchObject({ browser: "Chrome", device: null });
      expect(
        (
          await call("testportal-complete-manual-test-run", {
            projectId,
            runId: run.id,
            status: "passed",
          })
        ).isError,
      ).toBe(true);
      data(
        await call("testportal-update-manual-test-run-step", {
          projectId,
          runId: run.id,
          stepId: run.steps[0].id,
          status: "passed",
        }),
      );
      data(
        await call("testportal-complete-manual-test-run", {
          projectId,
          runId: run.id,
          status: "passed",
        }),
      );
      expect(
        (
          await call("testportal-update-manual-test-run-step", {
            projectId,
            runId: run.id,
            stepId: run.steps[0].id,
            status: "failed",
          })
        ).isError,
      ).toBe(true);
      data(
        await call("testportal-update-manual-run-environment-profile", {
          projectId,
          profileId: profile.id,
          browser: "Firefox",
        }),
      );
      data(
        await call("testportal-delete-manual-run-environment-profile", {
          projectId,
          profileId: profile.id,
        }),
      );
      data(
        await call("testportal-delete-test-scenario", {
          projectId,
          scenarioId: scenario.id,
        }),
      );
      const saved = data(
        await call("testportal-get-manual-test-run", {
          projectId,
          runId: run.id,
        }),
      );
      expect(saved).toMatchObject({
        browser: "Chrome",
        device: null,
        sourceTestScenarioId: scenario.id,
        testScenarioId: null,
        status: "passed",
      });
      expect(saved.steps[0]).toMatchObject({
        action: "Open",
        status: "passed",
      });
      const history = data(
        await call("testportal-list-manual-test-runs", { projectId }),
      );
      expect(history.runs).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: run.id })]),
      );
      console.log(
        "TP39 workflow measurement",
        JSON.stringify({ executeCalls, discoveryCalls, discoveryBytes }),
      );
    } finally {
      await client.close();
      if (server.listening)
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      await projectModel.deleteWithCascade(foreignProject);
      if (previousSecret === undefined) delete process.env.MCP_SECRET;
      else process.env.MCP_SECRET = previousSecret;
    }
  });

  it("preserves profile-derived snapshots across update and deletion through MCP adapters", async () => {
    const scenario = await createScenario();
    const profile = await profiles.create({ projectId, name: "Shared", browser: "Chrome", operatingSystem: "Linux", device: "Laptop", apiEnvironment: "Staging" }, userId);
    expect(await profiles.list({ projectId })).toEqual(expect.arrayContaining([expect.objectContaining({ id: profile.id, ownerId: userId })]));
    const first = await mcpManualTestRunHandler.start({ projectId, scenarioId: scenario.id, environmentProfileId: profile.id, browser: "Firefox", device: null, build: "42", deployment: "canary" }, userId);
    const firstSnapshot = { browser: "Firefox", operatingSystem: "Linux", device: null, apiEnvironment: "Staging", build: "42", deployment: "canary" };
    expect(first).toMatchObject(firstSnapshot);
    await profiles.update({ projectId, profileId: profile.id, operatingSystem: "Windows" });
    const second = await mcpManualTestRunHandler.start({ projectId, scenarioId: scenario.id, environmentProfileId: profile.id }, userId);
    const secondSnapshot = { browser: "Chrome", operatingSystem: "Windows", device: "Laptop", apiEnvironment: "Staging", build: null, deployment: null };
    expect(second).toMatchObject(secondSnapshot);
    expect(await profiles.remove({ projectId, profileId: profile.id })).toEqual({ projectId, profileId: profile.id, deleted: true });
    for (const [run, snapshot] of [[first, firstSnapshot], [second, secondSnapshot]] as const) {
      expect(await mcpManualTestRunHandler.get({ projectId, runId: run.id })).toMatchObject(snapshot);
      expect((await mcpManualTestRunHandler.list({ projectId })).runs.find(({ id }) => id === run.id)).toMatchObject(snapshot);
      expect((await mcpManualTestRunHandler.listForScenario({ projectId, scenarioId: scenario.id })).runs.find(({ id }) => id === run.id)).toMatchObject(snapshot);
    }
    await expect(mcpManualTestRunHandler.start({ projectId, scenarioId: scenario.id, environmentProfileId: profile.id }, userId)).rejects.toThrow();
    await expect(mcpManualTestRunHandler.start({ projectId, scenarioId: scenario.id, environmentProfileId: randomUUID() }, userId)).rejects.toThrow();
    for (const browser of ["x\ny", "x".repeat(201), 42]) {
      expect(startManualTestRunSchema.safeParse({ projectId, scenarioId: scenario.id, browser }).success).toBe(false);
    }
    expect(updateManualTestRunSchema.safeParse({ projectId, runId: first.id, browser: "changed" }).success).toBe(false);
    expect(await mcpManualTestRunHandler.get({ projectId, runId: first.id })).toMatchObject(firstSnapshot);
    expect(await dbClient.manualTestRun.count({ where: { projectId } })).toBe(2);
    const otherProjectId = randomUUID();
    await dbClient.project.create({ data: { id: otherProjectId, name: "Foreign profile project", ownerId: userId } });
    try {
      const foreign = await profiles.create({ projectId: otherProjectId, name: "Foreign" }, userId);
      await expect(profiles.update({ projectId, profileId: foreign.id, name: "No" })).rejects.toThrow("Profile not found");
      await expect(profiles.remove({ projectId, profileId: foreign.id })).rejects.toThrow("Profile not found");
      await expect(mcpManualTestRunHandler.start({ projectId, scenarioId: scenario.id, environmentProfileId: foreign.id }, userId)).rejects.toThrow();
      expect((await profiles.list({ projectId: otherProjectId }))[0]?.name).toBe("Foreign");
      expect(await dbClient.manualTestRun.count({ where: { projectId } })).toBe(2);
    } finally { await projectModel.deleteWithCascade(otherProjectId); }
    const direct = await mcpManualTestRunHandler.start({ projectId, scenarioId: scenario.id, browser: "Direct" }, userId);
    expect(direct).toMatchObject({ browser: "Direct", operatingSystem: null, device: null, apiEnvironment: null, build: null, deployment: null });
  });

  it("lists duplicate profiles in deterministic order and rejects repeated deletion", async () => {
    expect(await profiles.list({ projectId })).toEqual([]);
    const first = await profiles.create({ projectId, name: "Duplicate" }, userId);
    const second = await profiles.create({ projectId, name: "Duplicate" }, userId);
    const newest = await profiles.create({ projectId, name: "Newest" }, userId);
    expect(first.id).not.toBe(second.id);
    const tiedAt = new Date("2026-01-01T00:00:00Z");
    await dbClient.manualRunEnvironmentProfile.updateMany({ where: { id: { in: [first.id, second.id] } }, data: { createdAt: tiedAt } });
    await dbClient.manualRunEnvironmentProfile.update({ where: { id: newest.id }, data: { createdAt: new Date("2026-01-02T00:00:00Z") } });
    expect((await profiles.list({ projectId })).map(({ id }) => id)).toEqual([newest.id, ...[first.id, second.id].sort().reverse()]);
    await profiles.remove({ projectId, profileId: first.id });
    await expect(profiles.remove({ projectId, profileId: first.id })).rejects.toThrow("Profile not found");
  });

  it("allows another authenticated session to list and update a creator's shared profile", async () => {
    const otherUserId = randomUUID();
    await dbClient.user.create({ data: { id: otherUserId, name: "Other user", email: `profile-${otherUserId}@example.test` } });
    const previousSecret = process.env.MCP_SECRET;
    const secret = "profile-sharing-integration-secret";
    process.env.MCP_SECRET = secret;
    jest.useFakeTimers();
    const { default: router } = await import("@/mcp/server");
    jest.clearAllTimers();
    jest.useRealTimers();
    const app = express();
    app.use(express.json());
    app.use("/api", router);
    const server = createServer(app);
    const clients: Client[] = [];
    try {
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address() as AddressInfo;
      for (const actor of [userId, otherUserId]) {
        const client = new Client({ name: "profile-sharing-test", version: "1.0.0" });
        clients.push(client);
        await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${address.port}/api/v2/mcp`), { requestInit: { headers: { Authorization: `Bearer ${generateMcpToken(actor, secret)}` } } }));
      }
      const [creator, other] = clients;
      if (!creator || !other) throw new Error("Expected two authenticated clients");
      const created = await creator.callTool({ name: "testportal-execute-action", arguments: { actionId: "testportal-create-manual-run-environment-profile", arguments: { projectId, name: "Shared", browser: "Chrome" } } });
      expect(created.isError).not.toBe(true);
      const content = created.content[0];
      if (!content || content.type !== "text") throw new Error("Expected profile JSON text");
      const profile = JSON.parse(content.text) as { id: string; ownerId: string };
      expect(profile.ownerId).toBe(userId);
      const listed = await other.callTool({ name: "testportal-execute-action", arguments: { actionId: "testportal-list-manual-run-environment-profiles", arguments: { projectId } } });
      expect(listed.isError).not.toBe(true);
      const listContent = listed.content[0];
      if (!listContent || listContent.type !== "text") throw new Error("Expected profile list JSON text");
      expect(JSON.parse(listContent.text)).toEqual(expect.arrayContaining([expect.objectContaining({ id: profile.id, ownerId: userId })]));
      const updated = await other.callTool({ name: "testportal-execute-action", arguments: { actionId: "testportal-update-manual-run-environment-profile", arguments: { projectId, profileId: profile.id, browser: "Firefox" } } });
      expect(updated.isError).not.toBe(true);
      expect(await profiles.list({ projectId })).toEqual(expect.arrayContaining([expect.objectContaining({ id: profile.id, ownerId: userId, browser: "Firefox" })]));
    } finally {
      await Promise.all(clients.map((client) => client.close()));
      if (server.listening) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      jest.useRealTimers();
      if (previousSecret === undefined) delete process.env.MCP_SECRET; else process.env.MCP_SECRET = previousSecret;
      await dbClient.user.delete({ where: { id: otherUserId } });
    }
  });

  it("persists an MCP adapter workflow with independent snapshots, profile overrides, edits and retesting", async () => {
    const scenario = await createScenario();
    await testScenarioModel.update(scenario.id, projectId, { scenarioKey: "MCP-01" });
    const profile = await manualRunEnvironmentProfileService.create(projectId, userId, {
      name: "MCP profile", browser: "Chrome", operatingSystem: "Linux", device: "Laptop", apiEnvironment: "Staging",
    });
    const first = await mcpManualTestRunHandler.start({
      projectId, scenarioId: scenario.id, environmentProfileId: profile.id,
      browser: "Firefox", build: "build-42", deployment: "canary", notes: "Before run",
    }, userId);
    expect(first).toMatchObject({
      executedById: userId, status: "in_progress", browser: "Firefox", operatingSystem: "Linux",
      device: "Laptop", apiEnvironment: "Staging", build: "build-42", deployment: "canary",
    });
    expect(first.steps.map(({ id }) => id)).not.toEqual(scenario.steps.map(({ id }) => id));

    const firstStep = first.steps[0];
    if (!firstStep) throw new Error("Expected a run snapshot step");
    await mcpManualTestRunHandler.updateStep({ projectId, runId: first.id, stepId: firstStep.id, status: "failed", notes: "Observed failure" });
    await mcpManualTestRunHandler.updateStep({ projectId, runId: first.id, stepId: firstStep.id, status: "passed" });
    await mcpManualTestRunHandler.update({ projectId, runId: first.id, notes: null });
    await testScenarioModel.update(scenario.id, projectId, { title: "Edited for retest" });
    const retest = await mcpManualTestRunHandler.start({ projectId, scenarioId: scenario.id }, userId);

    expect(retest.id).not.toBe(first.id);
    expect(retest.steps[0]?.id).not.toBe(firstStep.id);
    expect(retest.title).toBe("Edited for retest");
    expect(await mcpManualTestRunHandler.get({ projectId, runId: first.id })).toMatchObject({
      title: scenario.title, notes: null, steps: expect.arrayContaining([expect.objectContaining({ id: firstStep.id, status: "passed", notes: "Observed failure" })]),
    });
    expect((await mcpManualTestRunHandler.list({ projectId })).runs.map(({ id }) => id)).toEqual(expect.arrayContaining([first.id, retest.id]));
    expect(await dbClient.manualTestRun.count({ where: { projectId } })).toBe(2);
    const page = await mcpManualTestRunHandler.list({ projectId });
    expect(page).toMatchObject({ total: 2, page: 1, limit: 30, totalPages: 1 });
    expect(page.runs[0]).not.toHaveProperty("steps");
    expect(page.runs[0]).not.toHaveProperty("notes");

    await mcpManualTestRunHandler.complete({ projectId, runId: first.id, status: "failed" });
    await mcpManualTestRunHandler.complete({ projectId, runId: retest.id, status: "skipped" });
    const tiedAt = new Date("2026-01-01T00:00:00.000Z");
    await dbClient.manualTestRun.updateMany({ where: { id: { in: [first.id, retest.id] } }, data: { startedAt: tiedAt } });
    const filtered = await mcpManualTestRunHandler.list({
      projectId, testScenarioId: scenario.id, sourceScenarioKey: "MCP-01", status: "failed",
      startedFrom: tiedAt.toISOString(), startedBefore: new Date(tiedAt.getTime() + 1000).toISOString(), page: 1, limit: 1,
    });
    expect(filtered).toMatchObject({ total: 1, page: 1, limit: 1, totalPages: 1 });
    expect(filtered.runs[0]?.id).toBe(first.id);
    const tiePageOne = await mcpManualTestRunHandler.list({ projectId, page: 1, limit: 1 });
    const tiePageTwo = await mcpManualTestRunHandler.list({ projectId, page: 2, limit: 1 });
    expect([tiePageOne.runs[0]?.id, tiePageTwo.runs[0]?.id]).toEqual([first.id, retest.id].sort().reverse());
    expect(await mcpManualTestRunHandler.listForScenario({ projectId, scenarioId: scenario.id, status: "failed" })).toMatchObject({ total: 1 });
    expect(await mcpManualTestRunHandler.list({ projectId, sourceScenarioKey: "NO-MATCH" })).toMatchObject({ runs: [], total: 0 });
  });

  it("enforces MCP completion, frozen metadata exceptions and empty-run completion through adapters", async () => {
    const scenario = await createScenario([{ action: "Only step" }]);
    const run = await mcpManualTestRunHandler.start({ projectId, scenarioId: scenario.id }, userId);
    const stepId = run.steps[0]?.id;
    if (!stepId) throw new Error("Expected one copied step");
    await expect(mcpManualTestRunHandler.complete({ projectId, runId: run.id, status: "passed" })).rejects.toThrow();
    expect(await manualTestRunModel.findById(run.id, projectId)).toMatchObject({ status: "in_progress", completedAt: null });
    await mcpManualTestRunHandler.updateStep({ projectId, runId: run.id, stepId, status: "skipped" });
    await expect(mcpManualTestRunHandler.complete({ projectId, runId: run.id, status: "passed" })).rejects.toThrow();
    const completed = await mcpManualTestRunHandler.complete({ projectId, runId: run.id, status: "skipped" });
    expect(completed).toMatchObject({ status: "skipped", steps: [{ id: stepId, status: "skipped" }] });
    await expect(mcpManualTestRunHandler.complete({ projectId, runId: run.id, status: "failed" })).rejects.toThrow();
    await expect(mcpManualTestRunHandler.updateStep({ projectId, runId: run.id, stepId, status: "failed" })).rejects.toThrow();
    const runKeyOnly = await mcpManualTestRunHandler.update({ projectId, runId: run.id, runKey: "Retest-1" });
    expect(runKeyOnly).toMatchObject({ runKey: "Retest-1", status: "skipped", completedAt: completed.completedAt });
    await expect(mcpManualTestRunHandler.update({ projectId, runId: run.id, runKey: "Rejected", notes: "late" })).rejects.toThrow();
    expect(await mcpManualTestRunHandler.get({ projectId, runId: run.id })).toMatchObject({ runKey: "Retest-1", notes: null, status: "skipped" });

    const emptyScenario = await createScenario([]);
    const emptyRun = await mcpManualTestRunHandler.start({ projectId, scenarioId: emptyScenario.id }, userId);
    expect((await mcpManualTestRunHandler.complete({ projectId, runId: emptyRun.id, status: "passed" })).status).toBe("passed");

    const earlyScenario = await createScenario([{ action: "Can stop here" }]);
    const earlyRun = await mcpManualTestRunHandler.start({ projectId, scenarioId: earlyScenario.id }, userId);
    for (const status of ["failed", "blocked"] as const) {
      const candidate = status === "failed" ? earlyRun : await mcpManualTestRunHandler.start({ projectId, scenarioId: earlyScenario.id }, userId);
      expect((await mcpManualTestRunHandler.complete({ projectId, runId: candidate.id, status })).steps[0]?.status).toBe("not_started");
    }
  });

  it("lists safe active executors and reassigns without altering execution evidence", async () => {
    const activeTargetId = randomUUID();
    const pendingId = randomUUID();
    const suspendedId = randomUUID();
    await dbClient.user.createMany({ data: [
      { id: activeTargetId, name: "A Target", email: `manual-run-active-${activeTargetId}@example.test`, status: "active" },
      { id: pendingId, name: "B Pending", email: `manual-run-pending-${pendingId}@example.test`, status: "pending" },
      { id: suspendedId, name: "C Suspended", email: `manual-run-suspended-${suspendedId}@example.test`, status: "suspended" },
    ] });
    const scenario = await createScenario([{ action: "Check" }]);
    const run = await mcpManualTestRunHandler.start({ projectId, scenarioId: scenario.id }, userId);
    const stepId = run.steps[0]?.id;
    if (!stepId) throw new Error("Expected one copied step");
    await mcpManualTestRunHandler.updateStep({ projectId, runId: run.id, stepId, status: "passed", notes: "Evidence" });
    const beforeComplete = await mcpManualTestRunHandler.get({ projectId, runId: run.id });
    const directory = await mcpManualTestRunHandler.listActiveUsers();
    expect(directory.every((entry) => Object.keys(entry).sort().join(",") === "email,id,name")).toBe(true);
    expect(directory.map(({ id }) => id)).toContain(activeTargetId);
    expect(directory.map(({ id }) => id)).not.toEqual(expect.arrayContaining([pendingId, suspendedId]));
    expect(directory.map(({ name, id }) => [name, id])).toEqual([...directory].sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id)).map(({ name, id }) => [name, id]));
    await expect(mcpManualTestRunHandler.reassignExecutor({ projectId, runId: run.id, executedById: suspendedId })).rejects.toThrow();
    await expect(mcpManualTestRunHandler.reassignExecutor({ projectId: randomUUID(), runId: run.id, executedById: activeTargetId })).rejects.toThrow("not found");
    expect((await mcpManualTestRunHandler.get({ projectId, runId: run.id })).executedById).toBe(userId);
    const reassignedActive = await mcpManualTestRunHandler.reassignExecutor({ projectId, runId: run.id, executedById: activeTargetId });
    expect(reassignedActive).toMatchObject({ executedById: activeTargetId, startedAt: beforeComplete.startedAt, steps: [{ id: stepId, status: "passed", notes: "Evidence", updatedAt: beforeComplete.steps[0]?.updatedAt }] });
    const completed = await mcpManualTestRunHandler.complete({ projectId, runId: run.id, status: "passed" });
    const reassignedCompleted = await mcpManualTestRunHandler.reassignExecutor({ projectId, runId: run.id, executedById: userId });
    expect(reassignedCompleted).toMatchObject({ executedById: userId, completedAt: completed.completedAt, steps: [{ id: stepId, status: "passed", notes: "Evidence", updatedAt: completed.steps[0]?.updatedAt }] });
  });

  it("keeps a resolved environment snapshot after profile changes and deletion", async () => {
    const scenario = await createScenario([]);
    const profile = await manualRunEnvironmentProfileService.create(projectId, userId, {
      name: "Desktop", browser: "Chrome", operatingSystem: "Linux", device: "Laptop", apiEnvironment: "Staging",
    });
    await expect(manualRunEnvironmentProfileService.list(projectId)).resolves.toContainEqual(expect.objectContaining({ id: profile.id }));
    await expect(manualRunEnvironmentProfileService.update(randomUUID(), profile.id, { name: "Foreign" })).rejects.toThrow("Project not found");
    const run = await manualTestRunService.startRun({ projectId, scenarioId: scenario.id, executedById: userId,
      environmentProfileId: profile.id, browser: null, build: "2026.10", deployment: "canary" });
    expect(run).toMatchObject({ browser: null, operatingSystem: "Linux", device: "Laptop", apiEnvironment: "Staging", build: "2026.10", deployment: "canary" });
    await manualRunEnvironmentProfileService.update(projectId, profile.id, { operatingSystem: "Windows" });
    await manualRunEnvironmentProfileService.remove(projectId, profile.id);
    expect(await manualTestRunService.getRun({ projectId, runId: run.id })).toMatchObject({ operatingSystem: "Linux", browser: null });
    expect((await manualTestRunService.listRuns({ projectId })).runs[0]).toMatchObject({ operatingSystem: "Linux", build: "2026.10" });
    await expect(manualTestRunService.startRun({ projectId, scenarioId: scenario.id, executedById: userId, environmentProfileId: profile.id })).rejects.toThrow("Environment profile not found");
    expect(await dbClient.manualTestRun.count({ where: { projectId } })).toBe(1);
  });

  it("returns null environment values for runs started without them", async () => {
    const scenario = await createScenario([]);
    const run = await startRun(scenario);
    const emptyEnvironment = { browser: null, operatingSystem: null, device: null, apiEnvironment: null, build: null, deployment: null };
    expect(run).toMatchObject(emptyEnvironment);
    expect(await manualTestRunService.getRun({ projectId, runId: run.id })).toMatchObject(emptyEnvironment);
    expect((await manualTestRunService.listRuns({ projectId })).runs[0]).toMatchObject(emptyEnvironment);
  });

  it("preserves active and completed snapshots after source edits and step deletion", async () => {
    const scenario = await createScenario();
    const run = await startRun(scenario);

    await testScenarioModel.update(scenario.id, projectId, {
      title: "Changed source title",
      details: "Changed source details",
    });
    await testScenarioModel.updateStep({
      scenarioId: scenario.id,
      projectId,
      stepId: scenario.steps[0]?.id ?? "",
      action: "Changed source action",
      expectedResult: "Changed source expectation",
    });
    await testScenarioModel.reorderSteps({
      scenarioId: scenario.id,
      projectId,
      stepIds: [scenario.steps[1]?.id ?? "", scenario.steps[0]?.id ?? ""],
    });
    await testScenarioModel.deleteStep({
      scenarioId: scenario.id,
      projectId,
      stepId: scenario.steps[0]?.id ?? "",
    });

    const stored = await manualTestRunModel.findById(run.id, projectId);
    expect(stored?.title).toBe(scenario.title);
    expect(stored?.details).toBe("Verify a manual run");
    expect(stored?.steps).toHaveLength(2);
    expect(
      stored?.steps.map(({ action, position }) => ({ action, position })),
    ).toEqual([
      { action: "Open login", position: 0 },
      { action: "Submit credentials", position: 1 },
    ]);
    expect(stored?.status).toBe("in_progress");

    const firstStep = stored?.steps[0];
    if (!firstStep) throw new Error("Expected a copied step");
    await manualTestRunService.updateStep({
      projectId,
      runId: run.id,
      stepId: firstStep.id,
      status: "passed",
    });
    await manualTestRunService.completeRun({
      projectId,
      runId: run.id,
      status: "failed",
    });
    const completed = await manualTestRunModel.findById(run.id, projectId);
    expect(completed?.status).toBe("failed");
    expect(completed?.steps[0]?.status).toBe("passed");

    await dbClient.testScenario.delete({ where: { id: scenario.id } });
    const detached = await mcpManualTestRunHandler.get({ projectId, runId: run.id });
    expect(detached?.sourceTestScenarioId).toBe(scenario.id);
    expect(detached?.testScenarioId).toBeNull();
    expect(detached?.title).toBe(scenario.title);
    expect(detached?.steps[0]?.action).toBe("Open login");
  });

  it("retains detached history and executor SET NULL semantics", async () => {
    const creatorId = randomUUID();
    const executorId = randomUUID();
    await dbClient.user.create({
      data: {
        id: creatorId,
        name: "Scenario Creator",
        email: `manual-run-creator-${creatorId}@example.test`,
      },
    });
    await dbClient.user.create({
      data: {
        id: executorId,
        name: "Deletable Executor",
        email: `manual-run-executor-${executorId}@example.test`,
      },
    });
    const scenario = await createScenario([], creatorId);
    const run = await startRun(scenario, executorId);
    await dbClient.user.delete({ where: { id: executorId } });
    await expect(
      dbClient.user.delete({ where: { id: creatorId } }),
    ).rejects.toThrow();
    await dbClient.testScenario.delete({ where: { id: scenario.id } });
    await dbClient.user.delete({ where: { id: creatorId } });

    const detached = await mcpManualTestRunHandler.get({ projectId, runId: run.id });
    expect(detached?.sourceTestScenarioId).toBe(scenario.id);
    expect(detached?.testScenarioId).toBeNull();
    expect(detached?.executedById).toBeNull();
    expect(detached?.executedBy).toBeNull();

    const history = await mcpManualTestRunHandler.list({ projectId });
    expect(history.runs.find(({ id }) => id === run.id)).toMatchObject({ sourceTestScenarioId: scenario.id, testScenarioId: null, executedById: null, executedBy: null });
    await expect(
      mcpManualTestRunHandler.listForScenario({ projectId, scenarioId: scenario.id }),
    ).rejects.toThrow("Test scenario");
    const filtered = await mcpManualTestRunHandler.list({
      projectId,
      testScenarioId: scenario.id,
    });
    expect(filtered.total).toBe(1);
  });

  it("supports zero-step completion and rejects repeated completed mutations", async () => {
    const scenario = await createScenario([]);
    const run = await startRun(scenario);
    const completed = await manualTestRunService.completeRun({
      projectId,
      runId: run.id,
      status: "passed",
    });
    expect(completed.status).toBe("passed");
    expect(completed.completedAt).not.toBeNull();
    await expect(
      manualTestRunService.updateRun({
        projectId,
        runId: run.id,
        notes: "Too late",
      }),
    ).rejects.toThrow("immutable");
  });

  it("serializes completion against a step update", async () => {
    const scenario = await createScenario();
    const run = await startRun(scenario);
    const stepId = run.steps[0]?.id;
    if (!stepId) throw new Error("Expected a copied step");

    const [stepResult, completionResult] = await Promise.allSettled([
      mcpManualTestRunHandler.updateStep({
        projectId,
        runId: run.id,
        stepId,
        status: "passed",
      }),
      mcpManualTestRunHandler.complete({
        projectId,
        runId: run.id,
        status: "failed",
      }),
    ]);
    expect(completionResult.status).toBe("fulfilled");
    expect(stepResult.status === "fulfilled" || stepResult.status === "rejected").toBe(
      true,
    );
    expect((await manualTestRunModel.findById(run.id, projectId))?.status).toBe(
      "failed",
    );
  });

  it("preserves omitted fields across concurrent partial step updates", async () => {
    const scenario = await createScenario();
    const run = await startRun(scenario);
    const stepId = run.steps[0]?.id;
    if (!stepId) throw new Error("Expected a copied step");

    await Promise.all([
      manualTestRunService.updateStep({
        projectId,
        runId: run.id,
        stepId,
        status: "passed",
      }),
      manualTestRunService.updateStep({
        projectId,
        runId: run.id,
        stepId,
        notes: "Retained execution note",
      }),
    ]);

    const stored = await manualTestRunModel.findById(run.id, projectId);
    expect(stored?.steps[0]?.status).toBe("passed");
    expect(stored?.steps[0]?.notes).toBe("Retained execution note");
  });

  it("enforces unique and nonnegative copied step positions", async () => {
    const scenario = await createScenario();
    const run = await startRun(scenario);
    const firstStep = run.steps[0];
    if (!firstStep) throw new Error("Expected a copied step");

    await expect(
      dbClient.manualTestRunStep.create({
        data: {
          manualTestRunId: run.id,
          position: -1,
          action: "Invalid negative position",
          updatedAt: new Date(),
        },
      }),
    ).rejects.toThrow();
    await expect(
      dbClient.manualTestRunStep.create({
        data: {
          manualTestRunId: run.id,
          position: firstStep.position,
          action: "Invalid duplicate position",
          updatedAt: new Date(),
        },
      }),
    ).rejects.toThrow();
    expect(
      await dbClient.manualTestRunStep.count({ where: { manualTestRunId: run.id } }),
    ).toBe(run.steps.length);

    await expect(
      dbClient.manualTestRun.update({
        where: { id: run.id },
        data: { status: "passed", completedAt: null },
      }),
    ).rejects.toThrow();
    await expect(
      dbClient.manualTestRun.update({
        where: { id: run.id },
        data: {
          status: "passed",
          completedAt: new Date(run.startedAt.getTime() - 1),
        },
      }),
    ).rejects.toThrow();
    expect((await manualTestRunModel.findById(run.id, projectId))?.status).toBe(
      "in_progress",
    );
  });

  it("captures a coherent snapshot when start races with authoring", async () => {
    const scenario = await createScenario();
    const [startResult, updateResult] = await Promise.all([
      manualTestRunModel.createFromScenario({
        projectId,
        scenarioId: scenario.id,
        executedById: userId,
      }),
      testScenarioModel.update(scenario.id, projectId, {
        title: "Raced source title",
        details: "Raced source details",
      }),
    ]);

    expect(updateResult?.title).toBe("Raced source title");
    expect(startResult).not.toBeNull();
    expect([
      [scenario.title, "Verify a manual run"],
      ["Raced source title", "Raced source details"],
    ]).toContainEqual([startResult?.title, startResult?.details]);
  });

  it("rolls back an incomplete snapshot when copied-step insertion fails", async () => {
    const scenario = await createScenario();
    const suffix = randomUUID().replaceAll("-", "");
    const functionName = `manual_run_snapshot_failure_${suffix}`;
    const triggerName = `manual_run_snapshot_failure_trigger_${suffix}`;
    await dbClient.$executeRawUnsafe(
      `CREATE FUNCTION "${functionName}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced manual run snapshot failure'; END; $$`,
    );
    await dbClient.$executeRawUnsafe(
      `CREATE TRIGGER "${triggerName}" BEFORE INSERT ON "ManualTestRunStep" FOR EACH ROW EXECUTE FUNCTION "${functionName}"()`,
    );

    try {
      await expect(
        manualTestRunModel.createFromScenario({
          projectId,
          scenarioId: scenario.id,
          executedById: userId,
        }),
      ).rejects.toThrow("forced manual run snapshot failure");
    } finally {
      await dbClient.$executeRawUnsafe(
        `DROP TRIGGER "${triggerName}" ON "ManualTestRunStep"`,
      );
      await dbClient.$executeRawUnsafe(`DROP FUNCTION "${functionName}"()`);
    }

    expect(
      await dbClient.manualTestRun.count({
        where: { sourceTestScenarioId: scenario.id },
      }),
    ).toBe(0);
  });

  it("serializes start with scenario and project deletion", async () => {
    const scenario = await createScenario([]);
    const [startResult, scenarioDeleteResult] = await Promise.all([
      manualTestRunModel.createFromScenario({
        projectId,
        scenarioId: scenario.id,
        executedById: userId,
      }),
      testScenarioModel.delete(scenario.id, projectId),
    ]);
    expect(scenarioDeleteResult).toBe(1);
    if (startResult) {
      const detached = await manualTestRunModel.findById(startResult.id, projectId);
      expect(detached?.testScenarioId).toBeNull();
      expect(detached?.sourceTestScenarioId).toBe(scenario.id);
    }

    const raceProjectId = randomUUID();
    await dbClient.project.create({
      data: {
        id: raceProjectId,
        name: `Manual Run Project Race ${raceProjectId}`,
        ownerId: userId,
      },
    });
    const raceScenario = await testScenarioModel.create({
      projectId: raceProjectId,
      createdById: userId,
      title: "Project deletion race scenario",
      steps: [{ action: "Race step" }],
    });
    if (!raceScenario) throw new Error("Failed to create project race scenario");

    const [projectStartResult, projectDeleteResult] = await Promise.all([
      manualTestRunModel.createFromScenario({
        projectId: raceProjectId,
        scenarioId: raceScenario.id,
        executedById: userId,
      }),
      projectModel.deleteWithCascade(raceProjectId),
    ]);
    expect(projectDeleteResult.id).toBe(raceProjectId);
    expect(
      projectStartResult === null || projectStartResult.projectId === raceProjectId,
    ).toBe(true);
    expect(await dbClient.project.findUnique({ where: { id: raceProjectId } })).toBeNull();
    expect(
      await dbClient.manualTestRun.count({ where: { projectId: raceProjectId } }),
    ).toBe(0);
  });

  it("rolls back project run cleanup when project deletion fails", async () => {
    const rollbackProjectId = randomUUID();
    await dbClient.project.create({
      data: {
        id: rollbackProjectId,
        name: `Manual Run Rollback Project ${rollbackProjectId}`,
        ownerId: userId,
      },
    });
    const scenario = await testScenarioModel.create({
      projectId: rollbackProjectId,
      createdById: userId,
      title: "Project rollback scenario",
      steps: [{ action: "Rollback step" }],
    });
    if (!scenario) throw new Error("Failed to create rollback scenario");
    const run = await manualTestRunModel.createFromScenario({
      projectId: rollbackProjectId,
      scenarioId: scenario.id,
      executedById: userId,
    });
    if (!run) throw new Error("Failed to create rollback run");

    const suffix = randomUUID().replaceAll("-", "");
    const functionName = `manual_run_project_failure_${suffix}`;
    const triggerName = `manual_run_project_failure_trigger_${suffix}`;
    await dbClient.$executeRawUnsafe(
      `CREATE FUNCTION "${functionName}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced project deletion failure'; END; $$`,
    );
    await dbClient.$executeRawUnsafe(
      `CREATE TRIGGER "${triggerName}" AFTER DELETE ON "Project" FOR EACH ROW EXECUTE FUNCTION "${functionName}"()`,
    );

    try {
      await expect(
        projectModel.deleteWithCascade(rollbackProjectId),
      ).rejects.toThrow("forced project deletion failure");
      expect(
        await dbClient.manualTestRun.findUnique({ where: { id: run.id } }),
      ).not.toBeNull();
      expect(await dbClient.testScenario.findUnique({ where: { id: scenario.id } })).not.toBeNull();
      expect(await dbClient.testScenarioStep.count({ where: { testScenarioId: scenario.id } })).toBe(1);
      expect(await dbClient.manualTestRunStep.count({ where: { manualTestRunId: run.id } })).toBe(1);
      expect(
        await dbClient.project.findUnique({ where: { id: rollbackProjectId } }),
      ).not.toBeNull();
    } finally {
      await dbClient.$executeRawUnsafe(
        `DROP TRIGGER "${triggerName}" ON "Project"`,
      );
      await dbClient.$executeRawUnsafe(`DROP FUNCTION "${functionName}"()`);
    }

    await projectModel.deleteWithCascade(rollbackProjectId);
  });

  it("combines status, scenario, and UTC date filters with matching totals", async () => {
    const scenario = await createScenario([]);
    const run = await startRun(scenario);
    const startedFrom = run.startedAt.toISOString();
    const startedBefore = new Date(run.startedAt.getTime() + 1_000).toISOString();
    await manualTestRunService.completeRun({
      projectId,
      runId: run.id,
      status: "failed",
    });

    const page = await manualTestRunService.listRuns({
      projectId,
      testScenarioId: scenario.id,
      status: "failed",
      startedFrom,
      startedBefore,
    });
    expect(page.total).toBe(1);
    expect(page.runs[0]?.id).toBe(run.id);
  });

  it("supports tie-stable pagination, open date ranges, and scoped scenario filters", async () => {
    const scenarioA = await createScenario([]);
    const scenarioB = await createScenario([]);
    const runA = await startRun(scenarioA);
    const runB = await startRun(scenarioA);
    const runC = await startRun(scenarioB);
    const tie = new Date("2026-01-01T00:00:00.000Z");
    await dbClient.manualTestRun.updateMany({
      where: { id: { in: [runA.id, runB.id, runC.id] } },
      data: { startedAt: tie },
    });
    await manualTestRunService.completeRun({
      projectId,
      runId: runB.id,
      status: "failed",
    });

    const expectedIds = [runA.id, runB.id, runC.id].sort().reverse();
    const page1 = await manualTestRunService.listRuns({
      projectId,
      page: 1,
      limit: 1,
    });
    const page2 = await manualTestRunService.listRuns({
      projectId,
      page: 2,
      limit: 1,
    });
    const page3 = await manualTestRunService.listRuns({
      projectId,
      page: 3,
      limit: 1,
    });
    expect(page1.total).toBe(3);
    expect([page1.runs[0]?.id, page2.runs[0]?.id, page3.runs[0]?.id]).toEqual(
      expectedIds,
    );

    const timezoneEquivalent = new Date(tie.getTime() - 2 * 60 * 60 * 1_000)
      .toISOString()
      .replace("Z", "+02:00");
    expect(
      (
        await manualTestRunService.listRuns({
          projectId,
          startedFrom: timezoneEquivalent,
        })
      ).total,
    ).toBe(3);
    expect(
      (
        await manualTestRunService.listRuns({
          projectId,
          startedBefore: new Date(tie.getTime() + 1_000).toISOString(),
        })
      ).total,
    ).toBe(3);
    expect(
      (
        await manualTestRunService.listRuns({
          projectId,
          startedBefore: tie.toISOString(),
        })
      ).total,
    ).toBe(0);

    const failedScenarioRuns = await manualTestRunService.listRuns({
      projectId,
      testScenarioId: scenarioA.id,
      status: "failed",
      startedFrom: tie.toISOString(),
      startedBefore: new Date(tie.getTime() + 1_000).toISOString(),
    });
    expect(failedScenarioRuns.total).toBe(1);
    expect(failedScenarioRuns.runs[0]?.id).toBe(runB.id);

    expect(
      (
        await manualTestRunService.listRuns({
          projectId,
          testScenarioId: randomUUID(),
        })
      ).total,
    ).toBe(0);

    const foreignProjectId = randomUUID();
    await dbClient.project.create({
      data: {
        id: foreignProjectId,
        name: `Manual Run Foreign Filter Project ${foreignProjectId}`,
        ownerId: userId,
      },
    });
    try {
      const foreignScenario = await testScenarioModel.create({
        projectId: foreignProjectId,
        createdById: userId,
        title: "Foreign filter scenario",
      });
      if (!foreignScenario) throw new Error("Failed to create foreign scenario");
      expect(
        (
          await manualTestRunService.listRuns({
            projectId,
            testScenarioId: foreignScenario.id,
          })
        ).total,
      ).toBe(0);
    } finally {
      await projectModel.deleteWithCascade(foreignProjectId);
    }
  });

  it("cascades only the deleted project's scenarios, runs, steps, and links", async () => {
    const retainedScenario = await createScenario();
    const retainedRun = await startRun(retainedScenario);
    const otherProjectId = randomUUID();
    await dbClient.project.create({
      data: {
        id: otherProjectId,
        name: `Manual Run Other Project ${otherProjectId}`,
        ownerId: userId,
      },
    });
    const otherScenario = await testScenarioModel.create({
      projectId: otherProjectId,
      createdById: userId,
      title: "Other project scenario",
      steps: [{ action: "Other step" }],
    });
    if (!otherScenario) throw new Error("Failed to create other scenario");
    const otherRun = await manualTestRunModel.createFromScenario({
      projectId: otherProjectId,
      scenarioId: otherScenario.id,
      executedById: userId,
    });
    if (!otherRun) throw new Error("Failed to create other run");

    const spec = await dbClient.spec.create({
      data: { projectId: otherProjectId, key: randomUUID(), title: "Linked spec", file: "cascade.spec.ts" },
    });
    await dbClient.testScenarioSpecLink.create({
      data: { testScenarioId: otherScenario.id, specId: spec.id },
    });
    await projectModel.deleteWithCascade(otherProjectId);
    expect(await dbClient.testScenario.count({ where: { projectId: otherProjectId } })).toBe(0);
    expect(await dbClient.testScenarioStep.count({ where: { testScenarioId: otherScenario.id } })).toBe(0);
    expect(await dbClient.testScenarioSpecLink.count({ where: { testScenarioId: otherScenario.id } })).toBe(0);
    expect(await dbClient.manualTestRunStep.count({ where: { manualTestRunId: otherRun.id } })).toBe(0);
    expect(await dbClient.testScenario.findUnique({ where: { id: retainedScenario.id } })).not.toBeNull();
    expect(await dbClient.testScenarioStep.count({ where: { testScenarioId: retainedScenario.id } })).toBe(retainedScenario.steps.length);
    expect(await dbClient.manualTestRun.findUnique({ where: { id: retainedRun.id } })).not.toBeNull();
    expect(await dbClient.manualTestRunStep.count({ where: { manualTestRunId: retainedRun.id } })).toBe(retainedRun.steps.length);
    expect(
      await dbClient.manualTestRun.findUnique({ where: { id: otherRun.id } }),
    ).toBeNull();
    expect(await dbClient.project.findUnique({ where: { id: projectId } })).not.toBeNull();
  });
});
