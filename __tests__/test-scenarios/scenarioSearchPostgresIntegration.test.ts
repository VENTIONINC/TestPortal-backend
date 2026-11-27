// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { randomUUID } from "node:crypto";

import express from "express";
import request from "supertest";

import { testScenarioModel } from "@/models/testScenarioModel";
import { dbClient } from "@/prisma/client";
import scenarios from "@/routes/test-scenarios";
import { jwtService } from "@/services/jwtService";

const describePostgres =
  process.env.RUN_POSTGRES_INTEGRATION_TESTS === "1" ? describe : describe.skip;

describePostgres("internal related scenario operation", () => {
  const route = "/internal/v1/scenarios/related";
  const projectId = randomUUID();
  const otherProjectId = randomUUID();
  const userId = randomUUID();
  const inactiveId = randomUUID();
  const email = `${userId}@example.test`;
  const inactiveEmail = `${inactiveId}@example.test`;
  const app = express().use(express.json(), scenarios);
  let sourceScenarioId: string;

  beforeAll(async () => {
    await dbClient.user.createMany({
      data: [
        { id: userId, name: "Search verification", email },
        {
          id: inactiveId,
          name: "Blocked verification",
          email: inactiveEmail,
          status: "suspended",
        },
      ],
    });
    await dbClient.project.createMany({
      data: [projectId, otherProjectId].map((id) => ({
        id,
        ownerId: userId,
        name: id,
      })),
    });
    const source = await testScenarioModel.create({
      projectId,
      createdById: userId,
      title: "Internal scenario search source",
    });
    if (!source) throw new Error("Could not create the source scenario");
    sourceScenarioId = source.id;
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    await dbClient.project.deleteMany({
      where: { id: { in: [projectId, otherProjectId] } },
    });
    await dbClient.user.deleteMany({
      where: { id: { in: [userId, inactiveId] } },
    });
    await dbClient.$disconnect();
  });

  it("rejects missing credentials, inactive users and wrong projects before calling search", async () => {
    const search = jest.spyOn(globalThis, "fetch");
    const token = jwtService.generateAccessToken({ userId, email });
    const inactiveToken = jwtService.generateAccessToken({
      userId: inactiveId,
      email: inactiveEmail,
    });
    await request(app)
      .post(route)
      .send({ projectId, sourceScenarioId })
      .expect(401);
    await request(app)
      .post(route)
      .set("Authorization", `Bearer ${inactiveToken}`)
      .send({ projectId, sourceScenarioId })
      .expect(403);
    await request(app)
      .post(route)
      .set("Authorization", `Bearer ${token}`)
      .send({ projectId: otherProjectId, sourceScenarioId })
      .expect(404);
    await request(app)
      .post(route)
      .set("Authorization", `Bearer ${token}`)
      .send({ projectId: randomUUID(), sourceScenarioId })
      .expect(404);
    expect(search).not.toHaveBeenCalled();
  });

  it("passes through empty results and reports upstream failure as unavailable", async () => {
    const originalEnvironment = process.env;
    process.env = {
      ...originalEnvironment,
      SCENARIO_SEARCH_URL: "https://search.example.test",
      SCENARIO_SEARCH_TOKEN: "test-service-token",
    };
    try {
      const search = jest
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(Response.json([]))
        .mockResolvedValueOnce(Response.json({}, { status: 503 }));
      const token = jwtService.generateAccessToken({ userId, email });
      const query = { projectId, sourceScenarioId };
      await request(app)
        .post(route)
        .set("Authorization", `Bearer ${token}`)
        .send(query)
        .expect(200, []);
      await request(app)
        .post(route)
        .set("Authorization", `Bearer ${token}`)
        .send(query)
        .expect(503, { error: "Scenario search is unavailable" });
      expect(search).toHaveBeenCalledWith(
        new URL("https://search.example.test/internal/v1/scenarios/related"),
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer test-service-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(query),
        }),
      );
    } finally {
      process.env = originalEnvironment;
    }
  });
});
