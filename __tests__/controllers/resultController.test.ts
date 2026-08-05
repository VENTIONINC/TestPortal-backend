// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { resultController } from "@/controllers/resultController";
import { resultService } from "@/services/resultService";
import { executeController } from "@/test-utils/httpMocks";

describe("resultController shared workspace access", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("reads and deletes results using project scope without owner scope", async () => {
    jest
      .spyOn(resultService, "getResultById")
      .mockResolvedValue({ id: "result-1" } as never);
    jest.spyOn(resultService, "deleteResult").mockResolvedValue();

    const readResponse = await executeController(resultController.getResultById, {
      params: { resultId: "result-1" },
      query: { projectId: "project-1" },
    });
    const deleteResponse = await executeController(resultController.deleteResult, {
      method: "DELETE",
      params: { resultId: "result-1" },
      query: { projectId: "project-1" },
    });

    expect(readResponse.statusCode).toBe(200);
    expect(resultService.getResultById).toHaveBeenCalledWith(
      "result-1",
      "project-1",
    );
    expect(deleteResponse.statusCode).toBe(204);
    expect(resultService.deleteResult).toHaveBeenCalledWith(
      "result-1",
      "project-1",
    );
  });

  it("exports JSONL for a project without owner scope", async () => {
    jest
      .spyOn(resultService, "exportAnalysisJsonl")
      .mockResolvedValue({ content: "{}\n", count: 1 } as never);

    const response = await executeController(
      resultController.exportAnalysisJsonl,
      {
        query: {
          projectId: "project-1",
          dateFrom: "2026-01-01",
          dateTo: "2026-01-31",
        },
      },
    );

    expect(response.statusCode).toBe(200);
    expect(resultService.exportAnalysisJsonl).toHaveBeenCalledWith({
      projectId: "project-1",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });
  });
});
