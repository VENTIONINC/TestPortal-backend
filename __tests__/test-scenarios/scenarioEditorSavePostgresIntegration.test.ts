// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import router from "@/routes/test-scenarios";
import { jwtService } from "@/services/jwtService";
import { dbClient } from "@/prisma/client";
import { testScenarioService as service } from "@/services/testScenarioService";
import { testScenarioModel } from "@/models/testScenarioModel";

const describePostgres =
  process.env.RUN_POSTGRES_INTEGRATION_TESTS === "1" ? describe : describe.skip;

describePostgres("atomic scenario editor", () => {
  const createdById = randomUUID();
  const projectId = randomUUID();
  beforeAll(async () => {
    await dbClient.user.create({
      data: {
        id: createdById,
        name: "Editor",
        email: `${createdById}@example.test`,
        status: "active",
      },
    });
    await dbClient.project.create({
      data: { id: projectId, name: projectId, ownerId: createdById },
    });
  });
  afterAll(async () => {
    await dbClient.project.delete({ where: { id: projectId } });
    await dbClient.user.delete({ where: { id: createdById } });
    await dbClient.$disconnect();
  });
  it("rolls back an injected failure after all aggregate writes and rejects unknown actors", async () => {
    const scenario = await service.createScenario({ projectId, createdById, title: "Transaction baseline", steps: [{ action: "Original" }], suiteIds: [], newSuites: [{ name: "Rollback baseline" }] });
    await expect(dbClient.$transaction(async (tx) => {
      const updated = await testScenarioModel.update(scenario.id, projectId, { actorId: createdById, title: "Transient fields", expectedRevision: scenario.revision, steps: [{ id: scenario.steps[0]?.id, action: "Transient step" }], suiteIds: [], newSuites: [{ name: "Transient suite" }] }, tx);
      expect(updated).toMatchObject({ title: "Transient fields", suites: [{ name: "Transient suite" }] });
      throw new Error("Injected after aggregate save");
    })).rejects.toThrow("Injected after aggregate save");
    expect(await service.getScenarioById(scenario.id, projectId)).toEqual(scenario);
    expect(await dbClient.testSuite.count({ where: { projectId, name: "Transient suite" } })).toBe(0);
    for (const mutation of [
      () => service.updateScenario({ scenarioId: scenario.id, projectId, actorId: randomUUID(), title: "Unknown actor" }),
      () => service.appendStep({ scenarioId: scenario.id, projectId, actorId: randomUUID(), action: "Unknown actor" }),
    ]) await expect(mutation()).rejects.toMatchObject({ code: "TEST_SCENARIO_NOT_FOUND" });
    expect(await service.getScenarioById(scenario.id, projectId)).toEqual(scenario);
  });
  it("saves and returns selected suites, safe authors and revision", async () => {
    const scenario = await service.createScenario({
      projectId,
      createdById,
      title: "Aggregate",
      steps: [{ action: "First" }, { action: "Second" }],
      suiteIds: [],
      newSuites: [{ name: "Deferred" }],
    });
    expect(scenario).toMatchObject({
      revision: 1,
      createdBy: { id: createdById, name: "Editor" },
      updatedBy: { id: createdById },
      suites: [{ name: "Deferred" }],
    });
    expect(Object.keys(scenario.createdBy).sort()).toEqual([
      "email",
      "id",
      "name",
    ]);
    const updated = await service.updateScenario({
      scenarioId: scenario.id,
      projectId,
      actorId: createdById,
      title: "Updated",
      expectedRevision: scenario.revision,
      steps: [
        {
          id: scenario.steps[1]?.id,
          action: "Second edited",
          expectedResult: null,
        },
        { action: "New" },
      ],
      suiteIds: scenario.suites.map(({ id }) => id),
      newSuites: [],
    });
    expect(updated).toMatchObject({
      revision: 2,
      title: "Updated",
      steps: [
        { id: scenario.steps[1]?.id, position: 0, action: "Second edited" },
        { position: 1, action: "New" },
      ],
    });
    expect(
      updated.steps.some((step) => step.id === scenario.steps[0]?.id),
    ).toBe(false);
    await expect(
      service.updateScenario({
        scenarioId: scenario.id,
        projectId,
        actorId: createdById,
        title: "Stale",
        expectedRevision: scenario.revision,
        steps: [],
        suiteIds: [],
        newSuites: [],
      }),
    ).rejects.toMatchObject({ code: "TEST_SCENARIO_CONFLICT" });
    expect((await service.getScenarioById(scenario.id, projectId)).title).toBe(
      "Updated",
    );
  });
  it("rolls fields, steps, suites and numbering back when a deferred suite collides", async () => {
    const before = await dbClient.project.findUniqueOrThrow({
      where: { id: projectId },
    });
    await expect(
      service.createScenario({
        projectId,
        createdById,
        title: "Rollback",
        steps: [{ action: "Action" }],
        newSuites: [{ name: "deferred" }],
        suiteIds: [],
      }),
    ).rejects.toMatchObject({ code: "TEST_SCENARIO_CONFLICT" });
    expect(
      await dbClient.testScenario.count({
        where: { projectId, title: "Rollback" },
      }),
    ).toBe(0);
    expect(
      (await dbClient.project.findUniqueOrThrow({ where: { id: projectId } }))
        .lastScenarioNumber,
    ).toBe(before.lastScenarioNumber);
    const scenario = await service.createScenario({
      projectId,
      createdById,
      title: "Foreign rows",
      steps: [{ action: "Keep" }],
    });
    await expect(
      service.updateScenario({
        scenarioId: scenario.id,
        projectId,
        actorId: createdById,
        title: "Invalid",
        steps: [{ id: randomUUID(), action: "Foreign" }],
        suiteIds: [],
        newSuites: [{ name: "Should roll back" }],
        expectedRevision: scenario.revision,
      }),
    ).rejects.toMatchObject({ code: "TEST_SCENARIO_NOT_FOUND" });
    expect((await service.getScenarioById(scenario.id, projectId)).title).toBe(
      "Foreign rows",
    );
    expect(
      await dbClient.testSuite.count({
        where: { projectId, name: "Should roll back" },
      }),
    ).toBe(0);
  });
  it("permits zero steps and preserves omitted collections on field-only writes", async () => {
    const scenario = await service.createScenario({
      projectId,
      createdById,
      title: "Zero",
      steps: [],
      suiteIds: [],
      newSuites: [],
    });
    const updated = await service.updateScenario({
      scenarioId: scenario.id,
      projectId,
      actorId: createdById,
      details: "Details",
    });
    expect(updated.steps).toEqual([]);
    expect(updated.suites).toEqual([]);
    expect(updated.revision).toBe(2);
  });
  it("preserves historical unknown updater and projection bytes on organization-only editor saves", async () => {
    const scenario = await service.createScenario({
      projectId,
      createdById,
      title: "Legacy projection",
      steps: [{ action: "Keep" }],
    });
    await dbClient.testScenario.update({
      where: { id: scenario.id },
      data: {
        contentMd: "# Legacy bytes",
        contentMdHash: "b".repeat(64),
        updatedById: null,
      },
    });
    expect(
      (await service.getScenarioById(scenario.id, projectId)).updatedBy,
    ).toBeNull();
    const updated = await service.updateScenario({
      scenarioId: scenario.id,
      projectId,
      actorId: createdById,
      expectedRevision: scenario.revision,
      steps: scenario.steps.map(({ id, action, expectedResult }) => ({
        id,
        action,
        expectedResult,
      })),
      suiteIds: [],
      newSuites: [{ name: "Organization only" }],
    });
    expect(updated.contentMd).toBe("# Legacy bytes");
    expect(updated.contentMdHash).toBe("b".repeat(64));
    expect(updated.updatedBy?.id).toBe(createdById);
  });
  it("serves authenticated aggregate create/edit and rejects stale or partial editor requests", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", router);
    const authorization = `Bearer ${jwtService.generateAccessToken({ userId: createdById, email: `${createdById}@example.test` })}`;
    const created = await request(app)
      .post("/api/v2/test-scenarios")
      .set("Authorization", authorization)
      .send({
        projectId,
        title: "REST aggregate",
        steps: [],
        suiteIds: [],
        newSuites: [{ name: "REST suite" }],
      })
      .expect(201);
    expect(created.body.updatedBy.id).toBe(createdById);
    const url = `/api/v2/test-scenarios/${created.body.id}?projectId=${projectId}`;
    await request(app)
      .patch(url)
      .set("Authorization", authorization)
      .send({ steps: [], expectedRevision: 1 })
      .expect(400);
    await request(app)
      .patch(url)
      .set("Authorization", authorization)
      .send({ scenarioKey: "manual" })
      .expect(400);
    await request(app)
      .patch(url)
      .set("Authorization", authorization)
      .send({ actorId: randomUUID(), title: "Spoof" })
      .expect(400);
    const updated = await request(app)
      .patch(url)
      .set("Authorization", authorization)
      .send({
        title: "REST saved",
        steps: [],
        suiteIds: [],
        newSuites: [],
        expectedRevision: 1,
      })
      .expect(200);
    expect(updated.body).toMatchObject({
      revision: 2,
      updatedBy: { id: createdById },
      suites: [],
    });
    await request(app)
      .patch(url)
      .set("Authorization", authorization)
      .send({
        title: "REST stale",
        steps: [],
        suiteIds: [],
        newSuites: [],
        expectedRevision: 1,
      })
      .expect(409);
    expect(
      (await service.getScenarioById(created.body.id, projectId)).title,
    ).toBe("REST saved");
  });
});
