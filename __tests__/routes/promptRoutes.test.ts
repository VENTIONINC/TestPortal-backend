// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import express from "express";
import request from "supertest";
import promptRoutes from "@/routes/promptRoutes";
import { jwtService } from "@/services/jwtService";
import { userService } from "@/services/userService";

jest.mock("@/services/jwtService");
jest.mock("@/services/userService");

const app = express();
app.use(express.json(), promptRoutes);

describe("prompt REST boundary", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(jwtService.extractTokenFromHeader).mockImplementation(header => {
      if (!header) throw new Error("Unauthorized");
      return "token";
    });
    jest.mocked(jwtService.verifyToken).mockReturnValue({ userId: "user" } as ReturnType<typeof jwtService.verifyToken>);
    jest.mocked(userService.getUserById).mockResolvedValue({ id: "user" } as never);
    jest.mocked(userService.assertActiveUser).mockImplementation(user => user as never);
  });

  it("requires authentication for discovery and generation", async () => {
    for (const response of [await request(app).get("/v2/prompts"), await request(app).get("/v2/prompts/tms-workflow-assistant"), await request(app).post("/v2/prompts/tms-workflow-assistant/generate").send({})]) expect(response.status).toBe(401);
  });

  it("reports invalid fields and unknown names", async () => {
    const invalid = await request(app).post("/v2/prompts/tms-workflow-assistant/generate").set("Authorization", "Bearer token").send({ project_id: "bad", task: " ", execution_mode: "other" });
    expect(invalid.status).toBe(400);
    expect(invalid.body.fields.map((issue: { field: string }) => issue.field)).toEqual(["project_id", "task", "execution_mode"]);
    expect((await request(app).post("/v2/prompts/missing/generate").set("Authorization", "Bearer token").send({})).status).toBe(404);
  });
});

