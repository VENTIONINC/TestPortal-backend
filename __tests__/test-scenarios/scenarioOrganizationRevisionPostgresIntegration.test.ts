// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0
import "@/test-utils/testEnv";
import { randomUUID } from "node:crypto";
import { dbClient } from "@/prisma/client";
import { testScenarioService as scenarios } from "@/services/testScenarioService";
import { testScenarioOrganizationService as service } from "@/services/testScenarioOrganizationService";
const describePostgres =
  process.env.RUN_POSTGRES_INTEGRATION_TESTS === "1" ? describe : describe.skip;
describePostgres("organization scenario revisions", () => {
  const userId = randomUUID(),
    projectId = randomUUID(),
    scenarioId = randomUUID();
  beforeAll(async () => {
    await dbClient.user.create({
      data: { id: userId, name: "Editor", email: `${userId}@example.test` },
    });
    await dbClient.project.create({
      data: {
        id: projectId,
        name: projectId,
        ownerId: userId,
        lastScenarioNumber: 1,
      },
    });
    await dbClient.testScenario.create({
      data: {
        id: scenarioId,
        projectId,
        createdById: userId,
        title: "Organization",
        scenarioKey: "TMS-1",
        scenarioNumber: 1,
        contentMd: "",
        contentMdHash: "",
      },
    });
  });
  afterAll(async () => {
    await dbClient.project.delete({ where: { id: projectId } });
    await dbClient.user.delete({ where: { id: userId } });
    await dbClient.$disconnect();
  });
  it("invalidates only changed memberships, preserves unknown actor and leaves reorder revision intact", async () => {
    const suite = await service.createSuite({ projectId, name: "Suite" });
    const revision = async () =>
      (
        await dbClient.testScenario.findUniqueOrThrow({
          where: { id: scenarioId },
        })
      ).revision;
    await service.mutateMembers({
      projectId,
      suiteId: suite.id,
      scenarioIds: [scenarioId],
      operation: "add",
    });
    expect(await revision()).toBe(2);
    await service.mutateMembers({
      projectId,
      suiteId: suite.id,
      scenarioIds: [scenarioId],
      operation: "add",
    });
    await service.reorderMembers({
      projectId,
      suiteId: suite.id,
      scenarioIds: [scenarioId],
    });
    expect(await revision()).toBe(2);
    expect(
      (
        await dbClient.testScenario.findUniqueOrThrow({
          where: { id: scenarioId },
        })
      ).updatedById,
    ).toBeNull();
    await service.deleteSuite(projectId, suite.id);
    expect(await revision()).toBe(3);
  });
  it("attributes moves and folder reassignment, and rejects foreign IDs atomically", async () => {
    const folder = await service.createFolder({ projectId, name: "Folder" });
    const before = await dbClient.testScenario.findUniqueOrThrow({
      where: { id: scenarioId },
    });
    await service.moveScenarios({
      projectId,
      scenarioIds: [scenarioId],
      folderId: folder.id,
      updatedById: userId,
    });
    expect(
      await dbClient.testScenario.findUniqueOrThrow({
        where: { id: scenarioId },
      }),
    ).toMatchObject({
      revision: before.revision + 1,
      updatedById: userId,
      folderId: folder.id,
    });
    await service.moveScenarios({
      projectId,
      scenarioIds: [scenarioId],
      folderId: folder.id,
      updatedById: userId,
    });
    expect(
      (
        await dbClient.testScenario.findUniqueOrThrow({
          where: { id: scenarioId },
        })
      ).revision,
    ).toBe(before.revision + 1);
    await expect(
      service.moveScenarios({
        projectId,
        scenarioIds: [scenarioId, randomUUID()],
        folderId: null,
        updatedById: userId,
      }),
    ).rejects.toThrow();
    expect(
      (
        await dbClient.testScenario.findUniqueOrThrow({
          where: { id: scenarioId },
        })
      ).folderId,
    ).toBe(folder.id);
    await service.deleteFolder({
      projectId,
      folderId: folder.id,
      disposition: "unfiled",
      updatedById: userId,
    });
    expect(
      await dbClient.testScenario.findUniqueOrThrow({
        where: { id: scenarioId },
      }),
    ).toMatchObject({
      revision: before.revision + 2,
      updatedById: userId,
      folderId: null,
    });
  });
  it("serializes concurrent membership additions without lost revisions or positions", async () => {
    const suites = await Promise.all(
      ["First", "Second"].map((name) =>
        service.createSuite({ projectId, name }),
      ),
    );
    const before = await dbClient.testScenario.findUniqueOrThrow({
      where: { id: scenarioId },
    });
    await Promise.all(
      suites.map((suite) =>
        service.mutateMembers({
          projectId,
          suiteId: suite.id,
          scenarioIds: [scenarioId],
          operation: "add",
          updatedById: userId,
        }),
      ),
    );
    expect(
      (
        await dbClient.testScenario.findUniqueOrThrow({
          where: { id: scenarioId },
        })
      ).revision,
    ).toBe(before.revision + 2);
    await service.mutateMembers({
      projectId,
      suiteId: suites[0]?.id ?? "",
      scenarioIds: [scenarioId],
      operation: "remove",
      updatedById: userId,
    });
    expect(
      (
        await dbClient.testScenario.findUniqueOrThrow({
          where: { id: scenarioId },
        })
      ).revision,
    ).toBe(before.revision + 3);
  });
  it.each(["add", "remove", "deleteSuite", "deleteFolder"] as const)(
    "serializes editor save against %s without partial content or unrelated-member damage",
    async (operation) => {
      const suite = await service.createSuite({
        projectId,
        name: `Contention ${operation}`,
      });
      const folder = await service.createFolder({
        projectId,
        name: `Contention ${operation}`,
      });
      const unrelated = await scenarios.createScenario({
        projectId,
        createdById: userId,
        title: "Unrelated",
        suiteIds: [suite.id],
      });
      const original = await scenarios.createScenario({
        projectId,
        createdById: userId,
        title: "Before contention",
        folderId: folder.id,
        steps: [{ action: "Retain" }],
        suiteIds: operation === "add" ? [] : [suite.id],
      });
      const write =
        operation === "deleteSuite"
          ? () => service.deleteSuite(projectId, suite.id, userId)
          : operation === "deleteFolder"
            ? () =>
                service.deleteFolder({
                  projectId,
                  folderId: folder.id,
                  disposition: "unfiled",
                  updatedById: userId,
                })
            : () =>
                service.mutateMembers({
                  projectId,
                  suiteId: suite.id,
                  scenarioIds: [original.id],
                  operation,
                  updatedById: userId,
                });
      const results = await Promise.allSettled([
        scenarios.updateScenario({
          projectId,
          scenarioId: original.id,
          actorId: userId,
          expectedRevision: original.revision,
          title: "Committed editor",
          folderId: folder.id,
          steps: [{ id: original.steps[0]?.id, action: "Edited atomically" }],
          suiteIds: original.suites.map((suite) => suite.id),
          newSuites: [],
        }),
        write(),
      ]);
      expect(results[1]?.status).toBe("fulfilled");
      const editor = results[0];
      if (editor?.status === "rejected")
        expect(editor.reason).toMatchObject({ code: "TEST_SCENARIO_CONFLICT" });
      const final = await scenarios.getScenarioById(original.id, projectId);
      const saved = editor?.status === "fulfilled";
      expect(final.title).toBe(
        saved ? "Committed editor" : "Before contention",
      );
      expect(final.steps.map((step) => step.action)).toEqual([
        saved ? "Edited atomically" : "Retain",
      ]);
      expect(final.revision).toBe(original.revision + (saved ? 2 : 1));
      if (operation === "deleteFolder") expect(final.folderId).toBeNull();
      else
        expect(final.suites.map((suite) => suite.id)).toEqual(
          operation === "add" ? [suite.id] : [],
        );
      const other = await scenarios.getScenarioById(unrelated.id, projectId);
      expect(other.title).toBe("Unrelated");
      expect(other.revision).toBe(
        operation === "deleteSuite"
          ? unrelated.revision + 1
          : unrelated.revision,
      );
      expect(other.suites.map((suite) => suite.id)).toEqual(
        operation === "deleteSuite" ? [] : [suite.id],
      );
      const members = await dbClient.testSuiteMember.findMany({
        where: { suiteId: suite.id },
      });
      expect(new Set(members.map((member) => member.position)).size).toBe(
        members.length,
      );
    },
    // PostgreSQL deadlock detection can consume one second per bounded retry.
    15000,
  );
  it.each(["append", "reorder"] as const)(
    "serializes independent step %s against aggregate save",
    async (operation) => {
      const original = await scenarios.createScenario({
        projectId,
        createdById: userId,
        title: `Step ${operation}`,
        steps: [{ action: "First" }, { action: "Second" }],
      });
      const results = await Promise.allSettled([
        scenarios.updateScenario({
          projectId,
          scenarioId: original.id,
          actorId: userId,
          expectedRevision: original.revision,
          title: "Editor title",
          steps: original.steps.map((step) => ({
            id: step.id,
            action: step.action,
          })),
          suiteIds: [],
          newSuites: [],
        }),
        operation === "append"
          ? scenarios.appendStep({
              projectId,
              scenarioId: original.id,
              actorId: userId,
              action: "Appended",
            })
          : scenarios.reorderSteps({
              projectId,
              scenarioId: original.id,
              actorId: userId,
              stepIds: [...original.steps].reverse().map((step) => step.id),
            }),
      ]);
      expect(results[1]?.status).toBe("fulfilled");
      const editor = results[0];
      if (editor?.status === "rejected")
        expect(editor.reason).toMatchObject({ code: "TEST_SCENARIO_CONFLICT" });
      const final = await scenarios.getScenarioById(original.id, projectId);
      expect(final.revision).toBe(
        original.revision + (editor?.status === "fulfilled" ? 2 : 1),
      );
      expect(final.steps.map((step) => step.position)).toEqual(
        final.steps.map((_, index) => index),
      );
      expect(final.steps.map((step) => step.action)).toEqual(
        operation === "append"
          ? ["First", "Second", "Appended"]
          : ["Second", "First"],
      );
      expect(final.title).toBe(
        editor?.status === "fulfilled" ? "Editor title" : original.title,
      );
    },
  );
  it("rejects unknown organization actors even for no-op writes, without mutation", async () => {
    const unknown = randomUUID();
    const suite = await service.createSuite({
      projectId,
      name: "Unknown actor",
    });
    const folder = await service.createFolder({
      projectId,
      name: "Unknown actor",
    });
    const before = await dbClient.testScenario.findUniqueOrThrow({
      where: { id: scenarioId },
    });
    const writes = [
      () =>
        service.moveScenarios({
          projectId,
          scenarioIds: [scenarioId],
          folderId: before.folderId,
          updatedById: unknown,
        }),
      () =>
        service.mutateMembers({
          projectId,
          suiteId: suite.id,
          scenarioIds: [scenarioId],
          operation: "remove",
          updatedById: unknown,
        }),
      () => service.deleteSuite(projectId, suite.id, unknown),
      () =>
        service.deleteFolder({
          projectId,
          folderId: folder.id,
          disposition: "unfiled",
          updatedById: unknown,
        }),
    ];
    for (const write of writes)
      await expect(write()).rejects.toMatchObject({
        code: "TEST_SCENARIO_NOT_FOUND",
      });
    expect(
      await dbClient.testScenario.findUniqueOrThrow({
        where: { id: scenarioId },
      }),
    ).toEqual(before);
    expect(await dbClient.testSuite.count({ where: { id: suite.id } })).toBe(1);
    expect(
      await dbClient.testScenarioFolder.count({ where: { id: folder.id } }),
    ).toBe(1);
  });
  it("returns a stale conflict when the loaded editor folder was subsequently deleted", async () => {
    const folder = await service.createFolder({
      projectId,
      name: "Deleted after load",
    });
    const loaded = await scenarios.createScenario({
      projectId,
      createdById: userId,
      title: "Loaded before deletion",
      folderId: folder.id,
      steps: [{ action: "Preserve" }],
    });
    await service.deleteFolder({
      projectId,
      folderId: folder.id,
      disposition: "unfiled",
      updatedById: userId,
    });
    await expect(
      scenarios.updateScenario({
        projectId,
        scenarioId: loaded.id,
        actorId: userId,
        expectedRevision: loaded.revision,
        folderId: folder.id,
        title: "Stale overwrite",
        steps: loaded.steps.map((step) => ({
          id: step.id,
          action: step.action,
        })),
        suiteIds: [],
        newSuites: [],
      }),
    ).rejects.toMatchObject({ code: "TEST_SCENARIO_CONFLICT" });
    expect(await scenarios.getScenarioById(loaded.id, projectId)).toMatchObject(
      {
        title: "Loaded before deletion",
        folderId: null,
        revision: loaded.revision + 1,
        steps: [{ action: "Preserve" }],
      },
    );
  });
});
