// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import { jsonBodyParser } from "@/middleware/json-body";
import { dbClient as db } from "@/prisma/client";
import scenarios from "@/routes/test-scenarios";
import { manualTestRunCreationModel } from "@/models/manualTestRunCreationModel";
import routes from "@/routes/scenario-tags";
import { jwtService } from "@/services/jwtService";

const integration =
  process.env.RUN_POSTGRES_INTEGRATION_TESTS === "1" ? describe : describe.skip;
integration("Project scenario tag API", () => {
  const app = express().use(express.json()).use(routes).use(scenarios);
  const projectId = randomUUID();
  const otherId = randomUUID();
  const actor = randomUUID();
  const blockedActor = randomUUID();
  const token = (id: string) =>
    `Bearer ${jwtService.generateAccessToken({
      userId: id,
      email: `${id}@example.test`,
    })}`;
  const path = (id: string) => `/v2/projects/${id}/scenario-tags`;
  beforeAll(async () => {
    await db.user.createMany({
      data: [actor, blockedActor].map((id) => ({
        id,
        name: id,
        email: `${id}@example.test`,
        status: id === actor ? "active" : "suspended",
      })),
    });
    await db.project.createMany({
      data: [projectId, otherId].map((id) => ({
        id,
        name: id,
        ownerId: actor,
      })),
    });
  });
  afterAll(async () => {
    await db.project.deleteMany({
      where: { id: { in: [projectId, otherId] } },
    });
    await db.user.deleteMany({ where: { id: { in: [actor, blockedActor] } } });
    await db.$disconnect();
  });
  test("concurrent creates, project scope, stable rename and denied writes", async () => {
    const project = path(projectId);
    const create = (url: string, name: string) =>
      request(app)
        .post(url)
        .set("Authorization", token(actor))
        .send({ name, description: " note " });
    const attempts = await Promise.all([
      create(project, " AC-6 "),
      create(project, "ac-6"),
    ]);
    expect(attempts.map((r) => r.status).sort()).toEqual([201, 409]);
    const tag = attempts.find((r) => r.status === 201)?.body;
    expect(tag).toMatchObject({
      name: tag.name.trim(),
      description: "note",
      usageCount: 0,
    });
    expect(attempts.find((r) => r.status === 409)?.body.error).toContain(
      `"${tag.name}"`,
    );
    await create(path(otherId), tag.name).expect(201);
    const edit = (base: string, id: string) =>
      request(app)
        .patch(`${base}/${tag.id}`)
        .set("Authorization", token(id))
        .send({ name: " Changed " });
    await edit(path(otherId), actor).expect(404);
    expect((await edit(project, actor).expect(200)).body).toMatchObject({
      id: tag.id,
      name: "Changed",
      description: "note",
    });
    await request(app).post(project).send({ name: "new" }).expect(401);
    await request(app)
      .post(project)
      .set("Authorization", token(blockedActor))
      .send({ name: "new" })
      .expect(403);
    await edit(project, blockedActor).expect(403);
    const list = await request(app)
      .get(project)
      .set("Authorization", token(actor))
      .expect(200);
    expect(list.body).toEqual([
      { id: tag.id, name: "Changed", description: "note", usageCount: 0 },
    ]);
  });
  test("deletion previews distinct impact, rejects stale and unauthorized requests, and restores as one unit", async () => {
    const project = path(projectId.toUpperCase());
    const second = await db.user.create({
      data: { name: "second", email: `${randomUUID()}@example.test` },
    });
    try {
      const first = await db.scenarioTag.create({
        data: { projectId, name: "first" },
      });
      const last = await db.scenarioTag.create({
        data: { projectId, name: "last" },
      });
      const tagIds = [first.id.toUpperCase(), last.id.toUpperCase()];
      const scenario = await db.testScenario.create({
        data: {
          projectId,
          title: "Existing",
          scenarioKey: "TS-1",
          scenarioNumber: 1,
          createdById: actor,
          contentMd: "",
          contentMdHash: "",
        },
      });
      const post = (suffix: string, body: object, id: string = actor) =>
        request(app)
          .post(`${project}/deletion${suffix}`)
          .set("Authorization", token(id))
          .send(body);
      const empty = await post("/preview", { tagIds }).expect(200);
      expect(empty.body.affectedCount).toBe(0);
      await db.scenarioTagAssignment.createMany({
        data: tagIds.map((tagId) => ({
          tagId,
          scenarioId: scenario.id,
          projectId,
        })),
      });
      const operationId = randomUUID();
      await post("", {
        tagIds,
        operationId,
        revision: empty.body.revision,
      }).expect(409);
      const current = await post("/preview", { tagIds }).expect(200);
      expect(current.body.affectedCount).toBe(1);
      const list = await request(app)
        .get(project)
        .set("Authorization", token(actor))
        .expect(200);
      expect(
        list.body
          .filter((t: { id: string }) => tagIds.includes(t.id.toUpperCase()))
          .map((t: { usageCount: number }) => t.usageCount),
      ).toEqual([1, 1]);
      const confirmation = {
        tagIds,
        operationId,
        revision: current.body.revision,
      };
      await post("", confirmation, blockedActor).expect(403);
      expect(
        await db.scenarioTagAssignment.count({ where: { projectId } }),
      ).toBe(2);
      await Promise.all([
        post("", confirmation).expect(200),
        post("", confirmation).expect(200),
      ]);
      await post("", confirmation).expect(200);
      await post("/undo", { operationId }, second.id).expect(404);
      await post("/undo", { operationId }, blockedActor).expect(403);
      const conflict = await db.scenarioTag.create({
        data: { projectId, name: "LAST" },
      });
      await post("/undo", { operationId }).expect(409);
      expect(
        await db.scenarioTag.count({ where: { id: { in: tagIds } } }),
      ).toBe(0);
      expect(
        await db.scenarioTagAssignment.count({ where: { projectId } }),
      ).toBe(0);
      await db.scenarioTag.delete({ where: { id: conflict.id } });
      await Promise.all([
        post("/undo", { operationId }).expect(204),
        post("/undo", { operationId }).expect(204),
      ]);
      await post("/undo", { operationId }).expect(204);
      expect(
        await db.scenarioTagAssignment.count({ where: { projectId } }),
      ).toBe(2);
    } finally {
      await db.user.delete({ where: { id: second.id } });
    }
  });
  test("confirmation returns 404 if the project was deleted after preview", async () => {
    const project = await db.project.create({
      data: { name: "Temporary", ownerId: actor },
    });
    const tag = await db.scenarioTag.create({
      data: { projectId: project.id, name: "Temporary" },
    });
    const tagIds = [tag.id];
    const endpoint = `${path(project.id)}/deletion`;
    const preview = await request(app)
      .post(`${endpoint}/preview`)
      .set("Authorization", token(actor))
      .send({ tagIds })
      .expect(200);
    await db.project.delete({ where: { id: project.id } });
    await request(app)
      .post(endpoint)
      .set("Authorization", token(actor))
      .send({
        tagIds,
        operationId: randomUUID(),
        revision: preview.body.revision,
      })
      .expect(404);
  });
  test("bulk desired state covers all selected identities and rolls back mixed projects", async () => {
    const project = path(projectId);
    const scenarios = Array.from({ length: 27 }, (_, i) => ({
      id: randomUUID(),
      projectId: i === 26 ? otherId : projectId,
      title: "Bulk",
      scenarioKey: `TS-${10 + i}`,
      scenarioNumber: 10 + i,
      createdById: actor,
      contentMd: "",
      contentMdHash: "",
    }));
    await db.testScenario.createMany({ data: scenarios });
    const ids = scenarios.map((s) => s.id);
    const assign = (body: object, id: string = actor) =>
      request(app)
        .put(`${project}/assignment`)
        .set("Authorization", token(id))
        .send(body);
    const inline = (name: string, id: string = actor) =>
      request(app)
        .post(`${project}/inline`)
        .set("Authorization", token(id))
        .send({ name });
    await inline("forbidden", blockedActor).expect(403);
    await assign(
      { name: "forbidden", present: true, scenarioIds: ids.slice(0, 26) },
      blockedActor,
    ).expect(403);
    await assign({
      name: "mixed projects",
      present: true,
      scenarioIds: ids,
    }).expect(404);
    expect(
      await db.scenarioTag.count({
        where: { projectId, name: { in: ["forbidden", "mixed projects"] } },
      }),
    ).toBe(0);
    const tag = (await inline("Shared").expect(200)).body;
    expect((await inline("shared").expect(200)).body.id).toBe(tag.id);
    await assign({
      name: " SHARED ",
      present: true,
      scenarioIds: ids.slice(0, 3),
    }).expect(200);
    const all = { tagId: tag.id, present: true, scenarioIds: ids.slice(0, 26) };
    await assign(all).expect(200);
    await assign(all).expect(200);
    expect(
      await db.scenarioTagAssignment.count({ where: { tagId: tag.id } }),
    ).toBe(26);
    await assign({ ...all, present: false, scenarioIds: ids }).expect(404);
    expect(
      await db.scenarioTagAssignment.count({ where: { tagId: tag.id } }),
    ).toBe(26);
    await assign({ ...all, present: false }).expect(200);
    await assign({ ...all, present: false }).expect(200);
    expect(
      await db.scenarioTagAssignment.count({ where: { tagId: tag.id } }),
    ).toBe(0);
  });
  test("editor creation is atomic and editor updates preserve independent assignments", async () => {
    await db.project.update({
      where: { id: projectId },
      data: { lastScenarioNumber: 100 },
    });
    const tag = await db.scenarioTag.create({
      data: { projectId, name: "Editor" },
    });
    const create = (title: string, tagIds: string[]) =>
      request(app)
        .post("/v2/test-scenarios")
        .set("Authorization", token(actor))
        .send({ projectId, title, tagIds });
    const original = (await create("Source", [tag.id]).expect(201)).body;
    expect(original.tags.map((t: { id: string }) => t.id)).toEqual([tag.id]);
    for (const title of ["Clone", "Create another"]) {
      const copy = (
        await create(
          title,
          original.tags.map((t: { id: string }) => t.id),
        ).expect(201)
      ).body;
      expect(copy.id).not.toBe(original.id);
      expect(copy.tags).toEqual(original.tags);
    }
    await create("Failed draft", [tag.id, randomUUID()]).expect(404);
    expect(
      await db.testScenario.count({
        where: { projectId, title: "Failed draft" },
      }),
    ).toBe(0);
    const remove = request(app)
      .put(`${path(projectId)}/assignment`)
      .set("Authorization", token(actor))
      .send({ tagId: tag.id, scenarioIds: [original.id], present: false });
    const save = request(app)
      .patch(`/v2/test-scenarios/${original.id}`)
      .query({ projectId })
      .set("Authorization", token(actor))
      .send({
        title: "Edited",
        steps: [],
        suiteIds: [],
        newSuites: [],
        expectedRevision: original.revision,
      });
    await Promise.all([remove.expect(200), save.expect(200)]);
    expect(
      await db.scenarioTagAssignment.count({
        where: { scenarioId: original.id },
      }),
    ).toBe(0);
  });
  test("suite tag filtering, facets, full selection and Updated ordering across calendar boundaries", async () => {
    const suite = await db.testSuite.create({
      data: { projectId, name: "Sort suite" },
    });
    const createTag = (name: string) =>
      db.scenarioTag.create({ data: { projectId, name } });
    const [a, b, c] = await Promise.all([
      createTag("Filter A"),
      createTag("Filter B"),
      createTag("Filter C"),
    ]);
    const fixtures = [
      { number: 210, date: "2024-01-02T00:01Z", tags: [a, b] },
      { number: 202, date: "2024-01-01T22:30Z", tags: [b] },
      { number: 203, date: "2024-01-01T23:30Z", tags: [c] },
      { number: 204, date: "2023-01-01T12:00Z", tags: [a] },
    ].map((fixture) => ({ ...fixture, id: randomUUID() }));
    const ids = fixtures.map((fixture) => fixture.id);
    await db.testScenario.createMany({
      data: fixtures.map(({ id, number, date }) => ({
        id,
        projectId,
        scenarioNumber: number,
        scenarioKey: `TMS-${number}`,
        createdById: actor,
        title: `Criteria ${number}`,
        updatedAt: new Date(date),
        contentMd: "",
        contentMdHash: "",
      })),
    });
    await db.testSuiteMember.createMany({
      data: ids.map((testScenarioId, i) => ({
        testScenarioId,
        suiteId: suite.id,
        position: i,
      })),
    });
    await db.scenarioTagAssignment.createMany({
      data: fixtures.flatMap(({ id, tags }) =>
        tags.map((tag) => ({ projectId, scenarioId: id, tagId: tag.id })),
      ),
    });
    const scope = {
      projectId,
      suiteId: suite.id,
      search: "Criteria",
      priority: "medium",
      createdById: actor,
    };
    const get = (suffix: string, query: object) =>
      request(app)
        .get(`/v2/test-scenarios${suffix}`)
        .query({ ...scope, ...query })
        .set("Authorization", token(actor));
    const tagIds = `${a.id},${b.id}`;
    const page = (await get("", { tagIds, limit: 2 }).expect(200)).body;
    expect(page.scenarios.map((s: { id: string }) => s.id)).toEqual(
      ids.slice(0, 2),
    );
    expect(page.total).toBe(3);
    expect(page.tagCounts).toEqual({
      [a.id]: 2,
      [b.id]: 2,
      [c.id]: 1,
    });
    expect(
      (await get("/selection", { tagIds }).expect(200)).body.scenarioIds.sort(),
    ).toEqual([ids[0], ids[1], ids[3]].sort());
    const sorted = async (query: object) =>
      (await get("", query).expect(200)).body.scenarios.map(
        (s: { id: string }) => s.id,
      );
    expect(
      await sorted({
        sortField: "updatedAt",
        timeZone: "Europe/Bratislava",
        limit: 1,
      }),
    ).toEqual([ids[2]]);
    expect(
      await sorted({
        sortField: "updatedAt",
        timeZone: "Europe/Bratislava",
        limit: 1,
        page: 2,
      }),
    ).toEqual([ids[0]]);
    expect(
      await sorted({
        sortField: "updatedAt",
        sortDirection: "asc",
        timeZone: "UTC",
      }),
    ).toEqual([ids[3], ids[1], ids[2], ids[0]]);
    expect(
      await sorted({ sortField: "updatedAt", timeZone: "+01:00" }),
    ).toEqual([ids[2], ids[0], ids[1], ids[3]]);
    expect(await sorted({ sort: "recently_updated" })).toEqual([
      ids[0],
      ids[2],
      ids[1],
      ids[3],
    ]);
  });
  test("completed run uses live tags, retains result, assignee and captured steps when its source disappears", async () => {
    const source = await db.testScenario.create({
      data: {
        projectId,
        scenarioNumber: 700,
        scenarioKey: "TMS-700",
        createdById: actor,
        title: "Live tags",
        contentMd: "",
        contentMdHash: "",
      },
    });
    const run = await db.manualTestRun.create({
      data: {
        projectId,
        title: "Completed",
        status: "completed",
        completedAt: new Date(),
        startedAt: new Date(Date.now() - 1000),
        completedById: actor,

        executedById: actor,
      },
    });
    const row = await db.manualTestRunScenario.create({
      data: {
        projectId,
        manualTestRunId: run.id,
        sourceScenarioId: source.id,
        sourceScenarioKey: source.scenarioKey,
        title: source.title,
        position: 0,
        result: "passed",
        assigneeId: actor,
        steps: { create: { position: 0, action: "Captured" } },
      },
    });
    const read = async () =>
      (await manualTestRunCreationModel.findById(projectId, run.id))
        ?.scenarios[0];
    for (const name of ["M1", "M2"]) {
      await db.scenarioTagAssignment.deleteMany({
        where: { scenarioId: source.id },
      });
      const tag = await db.scenarioTag.create({ data: { projectId, name } });
      await db.scenarioTagAssignment.create({
        data: { projectId, scenarioId: source.id, tagId: tag.id },
      });
      expect(await read()).toMatchObject({
        id: row.id,
        result: "passed",
        assigneeId: actor,
        tags: [{ name }],
        steps: [{ action: "Captured" }],
      });
    }
    await db.testScenario.delete({ where: { id: source.id } });
    expect(await read()).toMatchObject({
      id: row.id,
      result: "passed",
      assigneeId: actor,
      tags: [],
      steps: [{ action: "Captured" }],
    });
  });
  test("full catalog selection passes through the production JSON parser above the Prisma bind limit", async () => {
    const appWithApiPrefix = express().use(jsonBodyParser).use("/api", routes);
    const rows = Array.from({ length: 32768 }, (_, index) => ({
      id: randomUUID(),
      projectId,
      scenarioNumber: index + 1000,
      scenarioKey: `TMS-${index + 1000}`,
      createdById: actor,
      title: "Large selection",
      contentMd: "",
      contentMdHash: "",
    }));
    await db.testScenario.createMany({ data: rows });
    await db.$executeRaw`ANALYZE "TestScenario"`;
    const scenarioIds = rows.map((row) => row.id);
    const scopedPath = `/api${path(projectId)}`;
    const applied = await request(appWithApiPrefix)
      .put(`${scopedPath}/assignment`)
      .set("Authorization", token(actor))
      .send({ name: "Entire catalog", scenarioIds, present: true })
      .expect(200);
    const counts = await request(appWithApiPrefix)
      .post(`${scopedPath}/selection-counts`)
      .set("Authorization", token(actor))
      .send({ scenarioIds })
      .expect(200);
    expect(counts.body[applied.body.id]).toBe(scenarioIds.length);
    await request(appWithApiPrefix)
      .put(`${scopedPath}/assignment`)
      .set("Authorization", token(actor))
      .send({ tagId: applied.body.id, scenarioIds, present: false })
      .expect(200);
    expect(
      await db.scenarioTagAssignment.count({
        where: { tagId: applied.body.id },
      }),
    ).toBe(0);
  }, 30000);
});
