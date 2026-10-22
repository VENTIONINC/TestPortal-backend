// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import express from "express";
import request from "supertest";

import resultErrorRoutes from "@/routes/result-errors";

describe("result-error modal-context route", () => {
  it.each([
    ["post", "/v2/result-errors/error-1/issue"],
    ["patch", "/v2/result-errors/error-1/issue"],
  ] as const)("registers authenticated %s %s", async (method, path) => {
    const app = express();
    app.use(express.json());
    app.use(resultErrorRoutes);

    const response = await request(app)[method](path).send({});

    expect(response.status).toBe(401);
  });

  it("registers the endpoint behind authentication", async () => {
    const app = express();
    app.use(resultErrorRoutes);

    const response = await request(app).get(
      "/v2/result-errors/error-1/modal-context?projectId=project-1",
    );

    expect(response.status).toBe(401);
  });

  it("does not register the removed similarity endpoint", async () => {
    const app = express();
    app.use(resultErrorRoutes);

    const response = await request(app).get(
      "/v2/result-errors/error-1/similarity-suggestion?projectId=project-1",
    );

    expect(response.status).toBe(404);
  });
});
