// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { randomUUID } from "node:crypto";
import { dbClient } from "@/prisma/client";
import { manualTestRunCreationModel } from "@/models/manualTestRunCreationModel";
import { manualTestRunHistoryModel } from "@/models/manualTestRunHistoryModel";
import { manualTestRunMutationModel } from "@/models/manualTestRunMutationModel";
import { manualTestRunLifecycleModel } from "@/models/manualTestRunLifecycleModel";

const enabled = process.env.RUN_POSTGRES_INTEGRATION_TESTS === "1";
const describePostgres = enabled ? describe : describe.skip;
const userId = randomUUID();
const assigneeId = randomUUID();
const projectId = randomUUID();
const foreignProjectId = randomUUID();

async function createScenario(input: {
  title: string;
  scenarioKey: string;
  scenarioNumber: number;
  folderId?: string;
  steps: Array<{ action: string; expectedResult?: string | null }>;
}) {
  return await dbClient.testScenario.create({
    data: {
      title: input.title,
      scenarioKey: input.scenarioKey,
      scenarioNumber: input.scenarioNumber,
      projectId,
      createdById: userId,
      ...(input.folderId !== undefined ? { folderId: input.folderId } : {}),
      details: null,
      preconditions: "",
      testData: null,
      contentMd: "content must not be copied",
      contentMdHash: "a".repeat(64),
      steps: {
        create: input.steps.map((step, position) => ({
          position,
          action: step.action,
          expectedResult: step.expectedResult ?? null,
        })),
      },
    },
    include: { steps: true },
  });
}

describePostgres(
  "manual test run aggregate creation PostgreSQL integration",
  () => {
    let folderId: string;
    let scenarioOne: Awaited<ReturnType<typeof createScenario>>;
    let scenarioTwo: Awaited<ReturnType<typeof createScenario>>;

    beforeAll(async () => {
      if (!(process.env.DATABASE_URL ?? "").startsWith("postgresql://")) {
        throw new Error(
          "RUN_POSTGRES_INTEGRATION_TESTS=1 requires a PostgreSQL DATABASE_URL",
        );
      }
      await dbClient.user.create({
        data: {
          id: userId,
          name: "TP-59 Run User",
          email: `tp59-${userId}@example.test`,
        },
      });
      await dbClient.user.create({
        data: {
          id: assigneeId,
          name: "TP-59 Run Assignee",
          email: `tp59-assignee-${assigneeId}@example.test`,
        },
      });
      await dbClient.project.create({
        data: {
          id: projectId,
          name: `TP-59 Run Project ${projectId}`,
          ownerId: userId,
        },
      });
      await dbClient.project.create({
        data: {
          id: foreignProjectId,
          name: `TP-59 Foreign Project ${foreignProjectId}`,
          ownerId: userId,
        },
      });
      const folder = await dbClient.testScenarioFolder.create({
        data: { projectId, name: "Authentication" },
      });
      folderId = folder.id;
      scenarioOne = await createScenario({
        title: "Login as member",
        scenarioKey: "TP-SC-1",
        scenarioNumber: 1,
        folderId,
        steps: [{ action: "Open login", expectedResult: "Form shown" }],
      });
      scenarioTwo = await createScenario({
        title: "Reject invalid password",
        scenarioKey: "TP-SC-2",
        scenarioNumber: 2,
        steps: [{ action: "Submit invalid password", expectedResult: null }],
      });
    });

    beforeEach(async () => {
      await dbClient.manualTestRun.deleteMany({ where: { projectId } });
    });

    afterAll(async () => {
      await dbClient.manualTestRun.deleteMany({ where: { projectId } });
      await dbClient.testScenario.deleteMany({ where: { projectId } });
      await dbClient.testScenarioFolder.deleteMany({ where: { projectId } });
      await dbClient.testSuite.deleteMany({ where: { projectId } });
      await dbClient.project.deleteMany({
        where: { id: { in: [projectId, foreignProjectId] } },
      });
      await dbClient.user.deleteMany({ where: { id: userId } });
      await dbClient.user.deleteMany({ where: { id: assigneeId } });
      await dbClient.$disconnect();
    });

    it("deletes only the scoped run and cascades snapshots without deleting source scenarios", async () => {
      const run = await manualTestRunCreationModel.createFromCatalog({
        projectId,
        executedById: userId,
        scenarioIds: [scenarioOne.id],
      });
      if (!run) throw new Error("Run was not created");
      const snapshotId = run.scenarios[0]?.id;
      if (!snapshotId) throw new Error("Snapshot was not created");
      expect(
        await manualTestRunLifecycleModel.delete({
          projectId: foreignProjectId,
          runId: run.id,
        }),
      ).toBe(false);
      expect(
        await manualTestRunLifecycleModel.delete({ projectId, runId: run.id }),
      ).toBe(true);
      expect(
        await dbClient.manualTestRun.findUnique({ where: { id: run.id } }),
      ).toBeNull();
      expect(
        await dbClient.manualTestRunScenario.count({
          where: { manualTestRunId: run.id },
        }),
      ).toBe(0);
      expect(
        await dbClient.manualTestRunScenarioStep.count({
          where: { manualTestRunScenarioId: snapshotId },
        }),
      ).toBe(0);
      expect(
        await dbClient.manualTestRunLifecycleInterval.count({
          where: { manualTestRunId: run.id },
        }),
      ).toBe(0);
      expect(
        await dbClient.testScenario.findUnique({
          where: { id: scenarioOne.id },
        }),
      ).not.toBeNull();
    });

    it("creates ordered selected snapshots without source execution content", async () => {
      const run = await manualTestRunCreationModel.createFromCatalog({
        projectId,
        executedById: userId,
        scenarioIds: [scenarioTwo.id, scenarioOne.id],
        browser: "Chrome",
        build: "42",
      });

      expect(run).toMatchObject({
        title: "Manual run",
        status: "in_progress",
        executedById: userId,
        browser: "Chrome",
        build: "42",
      });
      expect(
        run?.scenarios.map(
          ({ sourceScenarioId, position, result, assigneeId }) => ({
            sourceScenarioId,
            position,
            result,
            assigneeId,
          }),
        ),
      ).toEqual([
        {
          sourceScenarioId: scenarioTwo.id,
          position: 0,
          result: "untested",
          assigneeId: null,
        },
        {
          sourceScenarioId: scenarioOne.id,
          position: 1,
          result: "untested",
          assigneeId: null,
        },
      ]);
      expect(run?.scenarios[1]).toMatchObject({
        title: "Login as member",
        folderPath: "Authentication",
        preconditions: "",
        steps: [
          { position: 0, action: "Open login", expectedResult: "Form shown" },
        ],
      });
      expect(run?.scenarios[1]).not.toHaveProperty("contentMd");

      await dbClient.testScenario.update({
        where: { id: scenarioOne.id },
        data: { title: "Changed source" },
      });
      const stored = await manualTestRunCreationModel.findById(
        projectId,
        run!.id,
      );
      expect(stored?.scenarios[1]?.title).toBe("Login as member");
    });

    it("uses the suite name and ordered suite membership", async () => {
      const suite = await dbClient.testSuite.create({
        data: {
          projectId,
          name: "Release acceptance",
          members: {
            create: [
              { testScenarioId: scenarioTwo.id, position: 0 },
              { testScenarioId: scenarioOne.id, position: 1 },
            ],
          },
        },
      });
      const run = await manualTestRunCreationModel.createFromCatalog({
        projectId,
        executedById: userId,
        suiteId: suite.id,
      });

      expect(run?.title).toBe("Release acceptance");
      expect(
        run?.scenarios.map(({ sourceScenarioId }) => sourceScenarioId),
      ).toEqual([scenarioTwo.id, scenarioOne.id]);
    });

    it("rejects a missing or foreign-project source without a partial run", async () => {
      const run = await manualTestRunCreationModel.createFromCatalog({
        projectId: foreignProjectId,
        executedById: userId,
        scenarioIds: [scenarioOne.id, scenarioTwo.id],
      });
      expect(run).toBeNull();
      expect(
        await dbClient.manualTestRun.count({
          where: { projectId: foreignProjectId },
        }),
      ).toBe(0);
    });

    it("rolls back the run and every snapshot when a copied step insert fails", async () => {
      const suffix = randomUUID().replaceAll("-", "");
      const functionName = `tp59_fail_step_${suffix}`;
      const triggerName = `tp59_fail_step_trigger_${suffix}`;
      await dbClient.$executeRawUnsafe(
        `CREATE FUNCTION "${functionName}"() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'fixture step failure'; END; $$ LANGUAGE plpgsql`,
      );
      await dbClient.$executeRawUnsafe(
        `CREATE TRIGGER "${triggerName}" BEFORE INSERT ON "ManualTestRunScenarioStep" FOR EACH ROW EXECUTE FUNCTION "${functionName}"()`,
      );
      try {
        await expect(
          manualTestRunCreationModel.createFromCatalog({
            projectId,
            executedById: userId,
            scenarioIds: [scenarioOne.id, scenarioTwo.id],
          }),
        ).rejects.toThrow("fixture step failure");
        expect(
          await dbClient.manualTestRun.count({ where: { projectId } }),
        ).toBe(0);
        expect(
          await dbClient.manualTestRunScenario.count({ where: { projectId } }),
        ).toBe(0);
      } finally {
        await dbClient.$executeRawUnsafe(
          `DROP TRIGGER IF EXISTS "${triggerName}" ON "ManualTestRunScenarioStep"`,
        );
        await dbClient.$executeRawUnsafe(
          `DROP FUNCTION IF EXISTS "${functionName}"()`,
        );
      }
    });

    it("filters recent runs, isolates projects, paginates, and reports whole-run counts", async () => {
      const now = new Date("2026-11-12T12:00:00.000Z");
      const active = await manualTestRunCreationModel.createFromCatalog({
        projectId,
        executedById: userId,
        scenarioIds: [scenarioOne.id, scenarioTwo.id],
      });
      const recentCompleted =
        await manualTestRunCreationModel.createFromCatalog({
          projectId,
          executedById: userId,
          scenarioIds: [scenarioOne.id],
        });
      const oldCompleted = await manualTestRunCreationModel.createFromCatalog({
        projectId,
        executedById: userId,
        scenarioIds: [scenarioTwo.id],
      });
      if (!active || !recentCompleted || !oldCompleted)
        throw new Error("Failed to create history fixture");

      await dbClient.manualTestRun.update({
        where: { id: recentCompleted.id },
        data: {
          status: "completed",
          startedAt: new Date("2026-11-02T12:00:00.000Z"),
          completedAt: new Date("2026-11-09T12:00:00.000Z"),
          completedById: userId,
          updatedAt: new Date("2026-11-09T12:00:00.000Z"),
        },
      });
      await dbClient.manualTestRunLifecycleInterval.updateMany({
        where: { manualTestRunId: recentCompleted.id },
        data: {
          startedAt: new Date("2026-11-02T12:00:00.000Z"),
          endedAt: new Date("2026-11-09T12:00:00.000Z"),
        },
      });
      await dbClient.manualTestRunScenario.updateMany({
        where: { manualTestRunId: recentCompleted.id },
        data: {
          result: "passed",
          resultById: userId,
          resultAt: new Date("2026-11-09T12:00:00.000Z"),
        },
      });
      await dbClient.manualTestRun.update({
        where: { id: oldCompleted.id },
        data: {
          status: "completed",
          startedAt: new Date("2026-10-20T12:00:00.000Z"),
          completedAt: new Date("2026-11-02T12:00:00.000Z"),
          completedById: userId,
          updatedAt: new Date("2026-11-02T12:00:00.000Z"),
        },
      });
      await dbClient.manualTestRunLifecycleInterval.updateMany({
        where: { manualTestRunId: oldCompleted.id },
        data: {
          startedAt: new Date("2026-10-20T12:00:00.000Z"),
          endedAt: new Date("2026-11-02T12:00:00.000Z"),
        },
      });

      const firstPage = await manualTestRunHistoryModel.list(
        {
          projectId,
          show: "all",
          period: "recent",
          timeZone: "UTC",
          page: 1,
          limit: 1,
        },
        now,
      );
      const secondPage = await manualTestRunHistoryModel.list(
        {
          projectId,
          show: "all",
          period: "recent",
          timeZone: "UTC",
          page: 2,
          limit: 1,
        },
        now,
      );
      const completedOnly = await manualTestRunHistoryModel.list(
        { projectId, show: "completed", period: "recent", timeZone: "UTC" },
        now,
      );

      expect(firstPage.total).toBe(2);
      expect(firstPage.totalPages).toBe(2);
      expect(firstPage.runs[0]?.id).not.toBe(secondPage.runs[0]?.id);
      expect([firstPage.runs[0]?.id, secondPage.runs[0]?.id]).toContain(
        active.id,
      );
      expect([firstPage.runs[0]?.id, secondPage.runs[0]?.id]).toContain(
        recentCompleted.id,
      );
      expect(completedOnly.runs.map(({ id }) => id)).toEqual([
        recentCompleted.id,
      ]);
      expect(completedOnly.runs[0]).toMatchObject({
        passedCount: 1,
        untestedCount: 0,
        scenarioCount: 1,
        completedDay: "2026-11-09",
      });
      expect(
        (
          await manualTestRunHistoryModel.list(
            {
              projectId,
              show: "all",
              period: "any_time",
              timeZone: "UTC",
              search: "does not match",
            },
            now,
          )
        ).total,
      ).toBe(0);
      expect(
        await manualTestRunHistoryModel.findById(projectId, active.id),
      ).not.toBeNull();
      expect(
        await manualTestRunHistoryModel.findById(foreignProjectId, active.id),
      ).toBeNull();
      expect(
        (
          await manualTestRunHistoryModel.list(
            {
              projectId: foreignProjectId,
              show: "all",
              period: "any_time",
              timeZone: "UTC",
            },
            now,
          )
        ).total,
      ).toBe(0);
    });

    it("includes runs whose lifecycle interval overlaps a custom period", async () => {
      const run = await manualTestRunCreationModel.createFromCatalog({
        projectId,
        executedById: userId,
        scenarioIds: [scenarioOne.id],
      });
      if (!run) throw new Error("Failed to create overlap fixture");
      await dbClient.manualTestRun.update({
        where: { id: run.id },
        data: {
          status: "completed",
          startedAt: new Date("2026-10-19T00:00:00.000Z"),
          completedAt: new Date("2026-10-23T00:00:00.000Z"),
          completedById: userId,
        },
      });
      await dbClient.manualTestRunLifecycleInterval.updateMany({
        where: { manualTestRunId: run.id },
        data: {
          startedAt: new Date("2026-10-19T00:00:00.000Z"),
          endedAt: new Date("2026-10-23T00:00:00.000Z"),
        },
      });
      const page = await manualTestRunHistoryModel.list(
        {
          projectId,
          show: "completed",
          period: "custom",
          timeZone: "UTC",
          dateFrom: "2026-10-20",
          dateTo: "2026-10-22",
        },
        new Date("2026-11-12T12:00:00.000Z"),
      );
      expect(page.runs.map(({ id }) => id)).toContain(run.id);
    });

    it("updates independent results, assignments, order, bulk targets, and rejects locked or foreign targets", async () => {
      const run = await manualTestRunCreationModel.createFromCatalog({
        projectId,
        executedById: userId,
        scenarioIds: [scenarioOne.id, scenarioTwo.id],
      });
      if (!run) throw new Error("Failed to create mutation fixture");
      const [first, second] = run.scenarios;
      if (!first || !second)
        throw new Error("Mutation fixture is missing scenario snapshots");

      const assigned = await manualTestRunMutationModel.updateAssignee({
        projectId,
        runId: run.id,
        scenarioId: first.id,
        assigneeId,
      });
      const resulted = await manualTestRunMutationModel.updateResult({
        projectId,
        runId: run.id,
        scenarioId: first.id,
        result: "passed",
        resultById: userId,
      });
      expect(assigned?.scenarios[0]).toMatchObject({ assigneeId });
      expect(resulted?.scenarios[0]).toMatchObject({
        result: "passed",
        resultById: userId,
        assigneeId,
      });

      await dbClient.user.update({
        where: { id: assigneeId },
        data: { status: "suspended" },
      });
      expect(
        await manualTestRunMutationModel.updateAssignee({
          projectId,
          runId: run.id,
          scenarioId: first.id,
          assigneeId,
        }),
      ).toBeNull();
      await dbClient.user.update({
        where: { id: assigneeId },
        data: { status: "active" },
      });

      const otherRun = await manualTestRunCreationModel.createFromCatalog({
        projectId,
        executedById: userId,
        scenarioIds: [scenarioOne.id],
      });
      const foreignSnapshot = otherRun?.scenarios[0];
      if (!foreignSnapshot)
        throw new Error("Failed to create out-of-run fixture");
      expect(
        await manualTestRunMutationModel.bulkUpdate({
          projectId,
          runId: run.id,
          scenarioIds: [first.id, foreignSnapshot.id],
          result: "failed",
          resultById: userId,
        }),
      ).toBeNull();
      expect(
        (await manualTestRunCreationModel.findById(projectId, run.id))
          ?.scenarios[0]?.result,
      ).toBe("passed");

      const reordered = await manualTestRunMutationModel.reorder({
        projectId,
        runId: run.id,
        scenarioIds: [second.id, first.id],
      });
      expect(reordered?.scenarios.map(({ id }) => id)).toEqual([
        second.id,
        first.id,
      ]);

      const bulk = await manualTestRunMutationModel.bulkUpdate({
        projectId,
        runId: run.id,
        scenarioIds: [first.id, second.id],
        result: "failed",
        resultById: userId,
        assigneeId: null,
      });
      expect(
        bulk?.scenarios.map(
          ({ result, resultById, assigneeId: assignedTo }) => ({
            result,
            resultById,
            assignedTo,
          }),
        ),
      ).toEqual([
        { result: "failed", resultById: userId, assignedTo: null },
        { result: "failed", resultById: userId, assignedTo: null },
      ]);
      expect(
        await manualTestRunMutationModel.updateResult({
          projectId,
          runId: run.id,
          scenarioId: foreignSnapshot.id,
          result: "passed",
          resultById: userId,
        }),
      ).toBeNull();

      const completedAt = new Date();
      await dbClient.manualTestRun.update({
        where: { id: run.id },
        data: { status: "completed", completedAt, completedById: userId },
      });
      await dbClient.manualTestRunLifecycleInterval.updateMany({
        where: { manualTestRunId: run.id },
        data: { endedAt: completedAt },
      });
      await expect(
        manualTestRunMutationModel.updateAssignee({
          projectId,
          runId: run.id,
          scenarioId: first.id,
          assigneeId: null,
        }),
      ).rejects.toThrow("Completed manual test runs are locked");
      expect(
        (await manualTestRunCreationModel.findById(projectId, run.id))
          ?.scenarios[1]?.result,
      ).toBe("failed");
    });

    it("updates the run timestamp after each successful scenario mutation", async () => {
      const run = await manualTestRunCreationModel.createFromCatalog({
        projectId,
        executedById: userId,
        scenarioIds: [scenarioOne.id, scenarioTwo.id],
      });
      if (!run?.scenarios[0] || !run.scenarios[1])
        throw new Error("Missing fixture");
      const first = run.scenarios[0].id;
      const second = run.scenarios[1].id;
      const old = new Date("2020-01-01T00:00:00Z");
      const operations = [
        () =>
          manualTestRunMutationModel.updateResult({
            projectId,
            runId: run.id,
            scenarioId: first,
            result: "passed",
            resultById: userId,
          }),
        () =>
          manualTestRunMutationModel.updateAssignee({
            projectId,
            runId: run.id,
            scenarioId: first,
            assigneeId,
          }),
        () =>
          manualTestRunMutationModel.reorder({
            projectId,
            runId: run.id,
            scenarioIds: [second, first],
          }),
        () =>
          manualTestRunMutationModel.bulkUpdate({
            projectId,
            runId: run.id,
            scenarioIds: [first, second],
            result: "failed",
            resultById: userId,
          }),
      ];
      for (const operation of operations) {
        await dbClient.manualTestRun.update({
          where: { id: run.id },
          data: { updatedAt: old },
        });
        const updated = await operation();
        expect(updated?.updatedAt.getTime()).toBeGreaterThan(old.getTime());
      }
    });

    it("completes atomically, skips only untested scenarios, and reopens without losing results", async () => {
      const run = await manualTestRunCreationModel.createFromCatalog({
        projectId,
        executedById: userId,
        scenarioIds: [scenarioOne.id, scenarioTwo.id],
      });
      if (!run) throw new Error("Failed to create lifecycle fixture");
      const first = run.scenarios[0];
      const second = run.scenarios[1];
      if (!first || !second)
        throw new Error("Lifecycle fixture is missing scenarios");
      await manualTestRunMutationModel.updateResult({
        projectId,
        runId: run.id,
        scenarioId: first.id,
        result: "passed",
        resultById: assigneeId,
      });

      const completed = await manualTestRunLifecycleModel.complete({
        projectId,
        runId: run.id,
        completedById: userId,
      });
      expect(completed).toMatchObject({
        status: "completed",
        completedById: userId,
        skippedAtCompletion: 1,
      });
      expect(completed?.completedAt).toBeInstanceOf(Date);
      expect(completed?.scenarios.map(({ result }) => result)).toEqual([
        "passed",
        "skipped",
      ]);
      expect(completed?.scenarios[0]).toMatchObject({ resultById: assigneeId });
      expect(completed?.scenarios[1]).toMatchObject({ resultById: userId });
      expect(
        await dbClient.manualTestRunLifecycleInterval.count({
          where: { manualTestRunId: run.id, endedAt: null },
        }),
      ).toBe(0);

      const reopened = await manualTestRunLifecycleModel.reopen({
        projectId,
        runId: run.id,
        reopenedById: assigneeId,
      });
      expect(reopened).toMatchObject({
        status: "in_progress",
        completedAt: null,
        completedById: null,
        skippedAtCompletion: 0,
      });
      expect(
        reopened?.scenarios.map(({ result, resultById }) => ({
          result,
          resultById,
        })),
      ).toEqual([
        { result: "passed", resultById: assigneeId },
        { result: "skipped", resultById: userId },
      ]);
      expect(
        await dbClient.manualTestRunLifecycleInterval.count({
          where: { manualTestRunId: run.id, endedAt: null },
        }),
      ).toBe(1);
      expect(
        await dbClient.manualTestRunLifecycleInterval.count({
          where: { manualTestRunId: run.id, endedAt: { not: null } },
        }),
      ).toBe(1);
    });

    it("serializes a result write racing with completion", async () => {
      const run = await manualTestRunCreationModel.createFromCatalog({
        projectId,
        executedById: userId,
        scenarioIds: [scenarioOne.id],
      });
      const scenario = run?.scenarios[0];
      if (!run || !scenario)
        throw new Error("Failed to create lifecycle race fixture");
      const outcomes = await Promise.allSettled([
        manualTestRunMutationModel.updateResult({
          projectId,
          runId: run.id,
          scenarioId: scenario.id,
          result: "passed",
          resultById: assigneeId,
        }),
        manualTestRunLifecycleModel.complete({
          projectId,
          runId: run.id,
          completedById: userId,
        }),
      ]);
      expect(outcomes[1]?.status).toBe("fulfilled");
      const finalRun = await manualTestRunCreationModel.findById(
        projectId,
        run.id,
      );
      expect(finalRun?.status).toBe("completed");
      expect(["passed", "skipped"]).toContain(finalRun?.scenarios[0]?.result);
      expect(finalRun?.skippedAtCompletion).toBe(
        finalRun?.scenarios[0]?.result === "skipped" ? 1 : 0,
      );
      if (outcomes[0]?.status === "rejected") {
        expect(outcomes[0].reason).toMatchObject({
          code: "MANUAL_TEST_RUN_CONFLICT",
        });
      }
    });
  },
);
