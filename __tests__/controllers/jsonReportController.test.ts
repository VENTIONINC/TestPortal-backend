// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { Request, Response } from "express";
import { jsonReportController } from "@/controllers/jsonReportController";
import { executeController } from "@/test-utils/httpMocks";

describe("jsonReportController shared workspace access", () => {
  it("passes an authenticated member and requested project to ingestion", async () => {
    const core = jest
      .spyOn(jsonReportController, "_processRawReportFileCore")
      .mockResolvedValue({ executionId: "execution-1", resultsCount: 1 } as never);

    const response = await executeController(
      jsonReportController.processRawReportFile as unknown as (
        req: Request,
        res: Response,
      ) => Promise<void>,
      {
        method: "POST",
        body: { projectId: "project-owned-by-another-user" },
        user: {
          id: "member-1",
          name: "Workspace Member",
          email: "member@example.com",
          status: "active",
          role: "member",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      },
    );

    expect(response.statusCode).toBe(201);
    expect(core).toHaveBeenCalledWith(
      undefined,
      "project-owned-by-another-user",
      "member-1",
    );
  });
});
