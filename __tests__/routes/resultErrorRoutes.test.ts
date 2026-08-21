// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import express from "express";
import request from "supertest";

import resultErrorRoutes from "@/routes/result-errors";

describe("result-error modal-context route", () => {
  it("registers the endpoint behind authentication", async () => {
    const app = express();
    app.use(resultErrorRoutes);

    const response = await request(app).get(
      "/v2/result-errors/error-1/modal-context?projectId=project-1",
    );

    expect(response.status).toBe(401);
  });

  it("protects the similarity endpoint with authentication", async () => {
    const app = express();
    app.use(resultErrorRoutes);

    const response = await request(app).get(
      "/v2/result-errors/error-1/similarity-suggestion?projectId=project-1",
    );

    expect(response.status).toBe(401);
  });
});
