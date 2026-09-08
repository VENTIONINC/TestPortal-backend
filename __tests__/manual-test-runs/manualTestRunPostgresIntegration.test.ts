// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { randomUUID } from "node:crypto";
import { dbClient } from "@/prisma/client";
import { projectModel } from "@/models/projectModel";
import { testScenarioModel } from "@/models/testScenarioModel";
import { manualTestRunModel } from "@/models/manualTestRunModel";
import { manualTestRunService } from "@/services/manualTestRunService";
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
    objective: "Verify a manual run",
    notes: "Scenario notes",
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
  });

  afterAll(async () => {
    await dbClient.manualTestRun.deleteMany({ where: { projectId } });
    await dbClient.testScenario.deleteMany({ where: { projectId } });
    await dbClient.project.deleteMany({ where: { id: projectId } });
    await dbClient.user.deleteMany({ where: { id: userId } });
    await dbClient.$disconnect();
  });

  it("preserves active and completed snapshots after source edits and step deletion", async () => {
    const scenario = await createScenario();
    const run = await startRun(scenario);

    await testScenarioModel.update(scenario.id, projectId, {
      title: "Changed source title",
      objective: "Changed source objective",
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
    expect(stored?.objective).toBe("Verify a manual run");
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
    const detached = await manualTestRunModel.findById(run.id, projectId);
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

    const detached = await manualTestRunModel.findById(run.id, projectId);
    expect(detached?.sourceTestScenarioId).toBe(scenario.id);
    expect(detached?.testScenarioId).toBeNull();
    expect(detached?.executedById).toBeNull();
    expect(detached?.executedBy).toBeNull();

    const history = await manualTestRunService.listRuns({ projectId });
    expect(history.runs.map(({ id }) => id)).toContain(run.id);
    await expect(
      manualTestRunService.listRuns({ projectId, scenarioId: scenario.id }),
    ).rejects.toThrow("Test scenario");
    const filtered = await manualTestRunService.listRuns({
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
      manualTestRunService.updateStep({
        projectId,
        runId: run.id,
        stepId,
        status: "passed",
      }),
      manualTestRunService.completeRun({
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
        objective: "Raced source objective",
      }),
    ]);

    expect(updateResult?.title).toBe("Raced source title");
    expect(startResult).not.toBeNull();
    expect([
      [scenario.title, "Verify a manual run"],
      ["Raced source title", "Raced source objective"],
    ]).toContainEqual([startResult?.title, startResult?.objective]);
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
      `CREATE TRIGGER "${triggerName}" BEFORE DELETE ON "Project" FOR EACH ROW EXECUTE FUNCTION "${functionName}"()`,
    );

    try {
      await expect(
        projectModel.deleteWithCascade(rollbackProjectId),
      ).rejects.toThrow("forced project deletion failure");
      expect(
        await dbClient.manualTestRun.findUnique({ where: { id: run.id } }),
      ).not.toBeNull();
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

  it("removes only a deleted project's runs and steps", async () => {
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

    await projectModel.deleteWithCascade(otherProjectId);
    expect(
      await dbClient.manualTestRun.findUnique({ where: { id: otherRun.id } }),
    ).toBeNull();
    expect(await dbClient.project.findUnique({ where: { id: projectId } })).not.toBeNull();
  });
});
