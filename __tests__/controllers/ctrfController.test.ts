// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { ctrfController } from "@/controllers/ctrfController";
import { executeController } from "@/test-utils/httpMocks";

describe("ctrfController shared workspace access", () => {
  it("passes the requested project to authenticated ingestion", async () => {
    const core = jest
      .spyOn(ctrfController, "_processRawReportFileCore")
      .mockResolvedValue({ executionId: "execution-1", resultsCount: 1 } as never);

    const response = await executeController(
      ctrfController.processRawReportFile,
      {
        method: "POST",
        body: { projectId: "project-owned-by-another-user" },
      },
    );

    expect(response.statusCode).toBe(201);
    expect(core).toHaveBeenCalledWith(
      undefined,
      "project-owned-by-another-user",
    );
  });
});
