// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { executeController } from "@/test-utils/httpMocks";
import { resultController } from "@/controllers/resultController";
import { resultService } from "@/services/resultService";

describe("resultController.getResultById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns the detail-specific Result response", async () => {
    const detail = {
      id: "result-1",
      relatedTestScenarios: [
        { id: "scenario-1", title: "Checkout", details: null, contentMd: "# Checkout\n" },
      ],
    };
    const serviceSpy = jest
      .spyOn(resultService, "getResultDetailById")
      .mockResolvedValue(detail as Awaited<
        ReturnType<typeof resultService.getResultDetailById>
      >);

    const res = await executeController(resultController.getResultById, {
      method: "GET",
      params: { resultId: "result-1" },
      query: { projectId: "project-1" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(detail);
    expect(serviceSpy).toHaveBeenCalledWith("result-1", "project-1");
  });

  it("preserves validation errors before calling the detail service", async () => {
    const serviceSpy = jest.spyOn(resultService, "getResultDetailById");

    const missingResult = await executeController(
      resultController.getResultById,
      {
        method: "GET",
        params: { resultId: "" },
        query: { projectId: "project-1" },
      },
    );
    const missingProject = await executeController(
      resultController.getResultById,
      { method: "GET", params: { resultId: "result-1" }, query: {} },
    );

    expect(missingResult.statusCode).toBe(400);
    expect(missingResult.body).toEqual({ error: "Result ID is required" });
    expect(missingProject.statusCode).toBe(400);
    expect(missingProject.body).toEqual({ error: "Project ID is required" });
    expect(serviceSpy).not.toHaveBeenCalled();
  });

  it("preserves the existing not-found response", async () => {
    jest
      .spyOn(resultService, "getResultDetailById")
      .mockRejectedValue(new Error("Result with ID missing-result not found"));

    const res = await executeController(resultController.getResultById, {
      method: "GET",
      params: { resultId: "missing-result" },
      query: { projectId: "project-1" },
    });

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      error: "Result with ID missing-result not found",
    });
  });
});
