// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { projectController } from "@/controllers/projectController";
import { projectService } from "@/services/projectService";
import { executeController } from "@/test-utils/httpMocks";

describe("projectController.getExecutionTypes", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("returns execution types for the requested project", async () => {
    jest
      .spyOn(projectService, "getExecutionTypes")
      .mockResolvedValue(["Nightly", "Release"]);

    const response = await executeController(
      projectController.getExecutionTypes,
      { params: { id: "project-1" } },
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(["Nightly", "Release"]);
    expect(projectService.getExecutionTypes).toHaveBeenCalledWith("project-1");
  });

  it("rejects a missing project id", async () => {
    const response = await executeController(
      projectController.getExecutionTypes,
      { params: { id: "" } },
    );

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({ error: "Invalid project ID" });
  });
});
