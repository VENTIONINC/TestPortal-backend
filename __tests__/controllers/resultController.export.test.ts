// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { executeController } from "@/test-utils/httpMocks";
import { resultController } from "@/controllers/resultController";
import { resultService } from "@/services/resultService";

describe("resultController.exportAnalysisJsonl", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should return 400 when projectId is missing", async () => {
    const res = await executeController(resultController.exportAnalysisJsonl, {
      method: "GET",
      query: { dateFrom: "2025-01-01", dateTo: "2025-01-02" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Project ID is required" });
  });

  it("should return 400 when dateFrom or dateTo is missing", async () => {
    const res = await executeController(resultController.exportAnalysisJsonl, {
      method: "GET",
      query: { projectId: "project-1", dateFrom: "2025-01-01" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "dateFrom and dateTo are required" });
  });

  it("should return JSONL content with download headers", async () => {
    jest.spyOn(resultService, "exportAnalysisJsonl").mockResolvedValue({
      content: "line1\n",
    });

    const res = await executeController(resultController.exportAnalysisJsonl, {
      method: "GET",
      query: {
        projectId: "project-1",
        dateFrom: "2025-01-01",
        dateTo: "2025-01-02",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe("line1\n");
    expect(res.get("Content-Type")).toBe("application/jsonl; charset=utf-8");
    expect(res.get("Content-Disposition")).toContain(
      "analysis-export-project-1",
    );
  });

  it("should return 400 when export fails", async () => {
    jest
      .spyOn(resultService, "exportAnalysisJsonl")
      .mockRejectedValue(new Error("Export failed"));

    const res = await executeController(resultController.exportAnalysisJsonl, {
      method: "GET",
      query: {
        projectId: "project-1",
        dateFrom: "2025-01-01",
        dateTo: "2025-01-02",
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: "Failed to export analysis. Export failed",
    });
  });
});
