// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { executeController } from "@/test-utils/httpMocks";
import { resultErrorController } from "@/controllers/resultErrorController";
import { resultErrorService } from "@/services/resultErrorService";

describe("resultErrorController.analyzeErrors", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when projectId is missing", async () => {
    const res = await executeController(resultErrorController.analyzeErrors, {
      method: "POST",
      body: { errorIds: ["err-1"] },
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: "Failed to analyze result errors. Project ID is required",
    });
  });

  it("returns 400 when errorIds is missing", async () => {
    const res = await executeController(resultErrorController.analyzeErrors, {
      method: "POST",
      body: { projectId: "project-1" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error:
        "Failed to analyze result errors. Error IDs array is required and must not be empty",
    });
  });

  it("returns 200 with analysis payload", async () => {
    jest
      .spyOn(resultErrorService, "analyzeErrors")
      .mockResolvedValue({
        analyzedResults: 1,
        updatedResultIds: ["res-1"],
        skippedErrorIds: [],
        totalErrors: 1,
      });

    const res = await executeController(resultErrorController.analyzeErrors, {
      method: "POST",
      body: { projectId: "project-1", errorIds: ["err-1"] },
    });

    expect(resultErrorService.analyzeErrors).toHaveBeenCalledWith(
      "project-1",
      ["err-1"],
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      analyzedResults: 1,
      updatedResultIds: ["res-1"],
      skippedErrorIds: [],
      totalErrors: 1,
    });
  });

  it("returns 400 when service throws", async () => {
    jest
      .spyOn(resultErrorService, "analyzeErrors")
      .mockRejectedValue(new Error("Analysis failed"));

    const res = await executeController(resultErrorController.analyzeErrors, {
      method: "POST",
      body: { projectId: "project-1", errorIds: ["err-1"] },
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: "Failed to analyze result errors. Analysis failed",
    });
  });
});
