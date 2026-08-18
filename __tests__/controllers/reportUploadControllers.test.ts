// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Request, Response } from "express";
import { ctrfController } from "@/controllers/ctrfController";
import { jsonReportController } from "@/controllers/jsonReportController";
import { FutureReportTimestampsError } from "@/lib/reportTimestampWarnings";
import { createMockResponse } from "@/test-utils/httpMocks";

const expectedMessage =
  "Import failed. Future test execution timestamps were detected. 3 timestamps exceed the allowed 10-minute tolerance. Maximum deviation: 2h 15m. No data was imported.";

describe("report upload timestamp validation responses", () => {
  it.each([
    [
      "Playwright JWT",
      jsonReportController,
      "processRawReportFile" as const,
      "_processRawReportFileCore" as const,
    ],
    [
      "Playwright API key",
      jsonReportController,
      "processRawReportFileWithApiKey" as const,
      "_processRawReportFileCore" as const,
    ],
    [
      "CTRF JWT",
      ctrfController,
      "processRawReportFile" as const,
      "_processRawReportFileCore" as const,
    ],
    [
      "CTRF API key",
      ctrfController,
      "processRawReportFileWithApiKey" as const,
      "_processRawReportFileCore" as const,
    ],
  ])("returns the backend validation message for %s", async (_, controller, handlerName, coreName) => {
    const core = jest
      .spyOn(controller, coreName)
      .mockRejectedValue(new FutureReportTimestampsError(3, 135));
    const res = createMockResponse<{ error: string }>();

    await controller[handlerName]({ body: {} } as Request, res as Response);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: expectedMessage });
    core.mockRestore();
  });
});
