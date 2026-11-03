// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { randomUUID } from "node:crypto";
import { dbClient } from "@/prisma/client";
import { testScenarioService } from "@/services/testScenarioService";
import { testScenarioModel } from "@/models/testScenarioModel";

const describePostgres =
  process.env.RUN_POSTGRES_INTEGRATION_TESTS === "1" ? describe : describe.skip;

describePostgres("scenario project allocator", () => {
  const createdById = randomUUID();
  const projectId = randomUUID();
  const otherProjectId = randomUUID();
  beforeAll(async () => {
    await dbClient.user.create({
      data: {
        id: createdById,
        name: "Allocator",
        email: `${createdById}@example.test`,
      },
    });
    for (const id of [projectId, otherProjectId]) {
      await dbClient.project.create({
        data: { id, name: id, ownerId: createdById },
      });
    }
  });
  afterAll(async () => {
    await dbClient.project.deleteMany({
      where: { id: { in: [projectId, otherProjectId] } },
    });
    await dbClient.user.delete({ where: { id: createdById } });
    await dbClient.$disconnect();
  });
  it("serializes concurrent creates independently by project and never reuses deleted committed numbers", async () => {
    const scenarios = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        testScenarioService.createScenario({
          projectId: i % 2 ? otherProjectId : projectId,
          createdById,
          title: `Scenario ${i}`,
        }),
      ),
    );
    for (const id of [projectId, otherProjectId]) {
      expect(
        scenarios
          .filter((s) => s.projectId === id)
          .map((s) => s.scenarioKey)
          .sort(),
      ).toEqual(["TMS-1", "TMS-2", "TMS-3", "TMS-4"]);
    }
    expect(scenarios.every((s) => s.priority === "medium")).toBe(true);
    const highest = scenarios.find(
      (s) => s.projectId === projectId && s.scenarioKey === "TMS-4",
    );
    expect(highest).toBeDefined();
    await testScenarioService.deleteScenario(highest?.id ?? "", projectId);
    expect(
      (
        await testScenarioService.createScenario({
          projectId,
          createdById,
          title: "After highest deletion",
        })
      ).scenarioKey,
    ).toBe("TMS-5");
    await dbClient.testScenario.deleteMany({ where: { projectId } });
    expect(
      (
        await testScenarioService.createScenario({
          projectId,
          createdById,
          title: "After all deletion",
        })
      ).scenarioKey,
    ).toBe("TMS-6");
  });
  it("rolls allocation back with the transaction", async () => {
    const before = await dbClient.project.findUniqueOrThrow({
      where: { id: projectId },
    });
    await expect(
      dbClient.$transaction(async (tx) => {
        await testScenarioModel.create(
          { projectId, createdById, title: "Rolled back" },
          tx,
        );
        throw new Error("injected failure");
      }),
    ).rejects.toThrow("injected failure");
    expect(
      await dbClient.testScenario.count({
        where: { projectId, title: "Rolled back" },
      }),
    ).toBe(0);
    const after = await testScenarioService.createScenario({
      projectId,
      createdById,
      title: "After rollback",
    });
    expect(after.scenarioKey).toBe(`TMS-${before.lastScenarioNumber + 1}`);
  });
  it("rejects supplied keys and null priority in the shared service without allocating", async () => {
    const before = await dbClient.project.findUniqueOrThrow({
      where: { id: projectId },
    });
    for (const invalid of [
      { scenarioKey: null },
      { scenarioKey: "custom" },
      { priority: null },
    ]) {
      await expect(
        testScenarioService.createScenario({
          projectId,
          createdById,
          title: "Invalid",
          ...invalid,
        }),
      ).rejects.toMatchObject({ code: "TEST_SCENARIO_VALIDATION_ERROR" });
    }
    expect(
      (await dbClient.project.findUniqueOrThrow({ where: { id: projectId } }))
        .lastScenarioNumber,
    ).toBe(before.lastScenarioNumber);
  });
});
