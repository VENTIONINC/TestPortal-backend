// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { Request, Response } from "express";
import { jsonReportController } from "@/controllers/jsonReportController";
import { executeController } from "@/test-utils/httpMocks";
import { dbClient } from "@/prisma/client";
import { jsonReportService } from "@/services/jsonReportService";
import { dashboardService } from "@/services/dashboardService";
import { storedResultEnrichmentService } from "@/services/storedResultEnrichmentService";

afterEach(() => jest.restoreAllMocks());

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

describe("jsonReportController Playwright enrichment normalization", () => {
  it("maps native output and error snippet fields into modal context", async () => {
    const transformed = await jsonReportController._transformRawReport({
      runId: "playwright-run",
      config: {},
      stats: { startTime: "2026-08-19T10:00:00Z" },
      suites: [
        {
          suites: [],
          specs: [
            {
              id: "checkout-spec",
              ok: false,
              file: "checkout.spec.ts",
              line: 10,
              column: 1,
              title: "checkout",
              tags: [],
              tests: [
                {
                  timeout: 30_000,
                  annotations: [],
                  expectedStatus: "passed",
                  projectId: "chromium",
                  projectName: "chromium",
                  status: "unexpected",
                  results: [
                    {
                      retry: 0,
                      status: "failed",
                      duration: 100,
                      startTime: "2026-08-19T10:00:00Z",
                      workerIndex: 0,
                      stdout: [{ text: "browser started" }],
                      stderr: [{ text: "request failed" }],
                      error: {
                        message: "checkout failed",
                        stack: "at checkout.spec.ts:12:3",
                        location: {
                          file: "checkout.spec.ts",
                          line: 12,
                          column: 3,
                        },
                        snippet:
                          "await page.goto('/');\nawait checkout.open();\nawait submit.click();",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(transformed.tests[0]?.results[0]).toEqual(
      expect.objectContaining({
        logs: ["browser started", "request failed"],
        errors: [
          expect.objectContaining({
            message: "checkout failed",
            rawLogs: ["browser started", "request failed"],
          }),
        ],
        sourceSnippet: {
          path: "checkout.spec.ts",
          text: "await page.goto('/');\nawait checkout.open();\nawait submit.click();",
          startLine: 10,
          failingLine: 12,
        },
      }),
    );
  });
});

describe("jsonReportController analysis enrichment", () => {
  const file = { buffer: Buffer.from("{}") } as Express.Multer.File;

  const prepareImport = (analyzeEnabled: boolean) => {
    jest
      .spyOn(jsonReportController, "_transformRawReport")
      .mockResolvedValue({ provider: "Playwright", tests: [] } as never);
    jest.spyOn(jsonReportService, "processReport").mockResolvedValue({
      success: true,
      executionId: "execution-1",
      specsProcessed: 1,
    });
    jest
      .spyOn(dbClient.user, "findUnique")
      .mockResolvedValue({ analyzeEnabled } as never);
    jest
      .spyOn(dbClient.result, "findMany")
      .mockResolvedValue([{ id: "result-1" }] as never);
    jest
      .spyOn(storedResultEnrichmentService, "analyzeAndPersist")
      .mockRejectedValue(new Error("Could not persist analysis"));
    jest.spyOn(dashboardService, "updateStats").mockResolvedValue(undefined);
  };

  it("retains saved report results and omits analysis when enrichment fails", async () => {
    prepareImport(true);

    const response = await jsonReportController._processRawReportFileCore(
      file,
      "project-1",
      "user-1",
    );

    expect(jsonReportService.processReport).toHaveBeenCalledTimes(1);
    expect(storedResultEnrichmentService.analyzeAndPersist).toHaveBeenCalledTimes(1);
    const reportCallOrder = (jsonReportService.processReport as jest.Mock).mock
      .invocationCallOrder[0];
    const enrichmentCallOrder = (
      storedResultEnrichmentService.analyzeAndPersist as jest.Mock
    ).mock.invocationCallOrder[0];
    if (reportCallOrder === undefined || enrichmentCallOrder === undefined) {
      throw new Error("Expected both report and enrichment calls");
    }
    expect(reportCallOrder).toBeLessThan(enrichmentCallOrder);
    expect(response.analysis).toBeUndefined();
    expect(response.executionId).toBe("execution-1");
  });

  it("keeps the user analysis preference gate", async () => {
    prepareImport(false);

    const response = await jsonReportController._processRawReportFileCore(
      file,
      "project-1",
      "user-1",
    );

    expect(storedResultEnrichmentService.analyzeAndPersist).not.toHaveBeenCalled();
    expect(response.analysis).toBeUndefined();
  });
});
