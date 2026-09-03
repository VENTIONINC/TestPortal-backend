// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";

import { ctrfService } from "@/services/ctrfService";
import { jsonReportService } from "@/services/jsonReportService";
import { testAnalysisService } from "@/services/testAnalysisService";
import { dashboardService } from "@/services/dashboardService";
import type { CTRFReport } from "@/types/ctrf";

// Mock dependencies
jest.mock("@/services/jsonReportService");
jest.mock("@/services/testAnalysisService");
jest.mock("@/services/dashboardService");
jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock Prisma client
jest.mock("@/prisma/client", () => {
  const dbClient = {
    project: {
      findUnique: jest.fn(),
    },
    result: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  dbClient.$transaction.mockImplementation((callback) => callback(dbClient));
  return { dbClient };
});

const { dbClient: mockDbClient } = require("@/prisma/client");
const mockTx = mockDbClient;

describe("ctrfService", () => {
  const mockProjectId = "project-123";
  const mockReport: CTRFReport = {
    results: {
      tool: { name: "jest", version: "1.0.0" },
      summary: {
        start: Date.now(),
        stop: Date.now() + 1000,
        tests: 1,
        passed: 1,
        failed: 0,
        pending: 0,
        skipped: 0,
        other: 0,
      },
      tests: [
        {
          name: "test 1",
          status: "passed",
          duration: 100,
        },
      ],
      environment: {
        buildNumber: "build-1",
        testEnvironment: "dev",
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (jsonReportService.processReport as jest.Mock).mockResolvedValue({
      success: true,
      executionId: "exec-123",
      specsProcessed: 1,
    });
    (dashboardService.updateStats as jest.Mock).mockResolvedValue(undefined);
  });

  it("commits persistence before running analysis and dashboard work", async () => {
    mockDbClient.project.findUnique.mockResolvedValue({
      owner: { analyzeEnabled: false },
    });

    await ctrfService.processReport(mockReport, {
      projectId: mockProjectId,
    });

    expect(mockDbClient.$transaction).not.toHaveBeenCalled();
    expect(jsonReportService.processReport).toHaveBeenCalledWith(
      expect.objectContaining({ runId: "build-1" }),
      mockProjectId,
    );
    expect(dashboardService.updateStats).toHaveBeenCalledWith(
      "exec-123",
      mockProjectId,
      mockDbClient,
    );
  });

  it("does not run post-persistence work when the import transaction fails", async () => {
    (jsonReportService.processReport as jest.Mock).mockRejectedValue(
      new Error("batch insert failed"),
    );

    await expect(
      ctrfService.processReport(mockReport, { projectId: mockProjectId }),
    ).rejects.toThrow("batch insert failed");

    expect(mockDbClient.project.findUnique).not.toHaveBeenCalled();
    expect(testAnalysisService.analyzeStoredResults).not.toHaveBeenCalled();
    expect(dashboardService.updateStats).not.toHaveBeenCalled();
  });

  it("should process report and skip analysis if disabled", async () => {
    mockTx.project.findUnique.mockResolvedValue({
      owner: { analyzeEnabled: false },
    });

    const result = await ctrfService.processReport(mockReport, {
      projectId: mockProjectId,
    });

    expect(jsonReportService.processReport).toHaveBeenCalledWith(
      expect.objectContaining({ runId: "build-1" }),
      mockProjectId,
    );
    expect(mockTx.project.findUnique).toHaveBeenCalledWith({
      where: { id: mockProjectId },
      include: { owner: true },
    });
    expect(result.analysis).toBeUndefined();
  });

  it("should process report and perform analysis if enabled", async () => {
    mockTx.project.findUnique.mockResolvedValue({
      owner: { analyzeEnabled: true },
    });
    mockTx.result.findMany.mockResolvedValue([{ id: "res-1" }]);

    const mockAnalysis = new Map();
    mockAnalysis.set("res-1", {
      status: "analyzed",
      confidence: 0.9,
    });
    (testAnalysisService.analyzeStoredResults as jest.Mock).mockResolvedValue(
      mockAnalysis,
    );

    const result = await ctrfService.processReport(mockReport, {
      projectId: mockProjectId,
    });

    expect(testAnalysisService.analyzeStoredResults).toHaveBeenCalled();
    expect(mockTx.result.update).toHaveBeenCalledWith({
      where: { id: "res-1" },
      data: expect.objectContaining({ analysisStatus: "analyzed" }),
    });
    expect(result.analysis).toHaveLength(1);
  });

  it("should handle analysis failure gracefully", async () => {
    mockTx.project.findUnique.mockResolvedValue({
      owner: { analyzeEnabled: true },
    });
    mockTx.result.findMany.mockResolvedValue([{ id: "res-1" }]);
    (testAnalysisService.analyzeStoredResults as jest.Mock).mockRejectedValue(
      new Error("Analysis failed"),
    );

    const result = await ctrfService.processReport(mockReport, {
      projectId: mockProjectId,
    });

    expect(testAnalysisService.analyzeStoredResults).toHaveBeenCalled();
    expect(mockTx.result.update).not.toHaveBeenCalled();
    expect(result.analysis).toBeUndefined();
  });

  it("should skip analysis when non-passing exceeds 50%", async () => {
    mockTx.project.findUnique.mockResolvedValue({
      owner: { analyzeEnabled: true },
    });
    mockTx.result.findMany.mockResolvedValue([
      { id: "res-1", status: "failed" },
      { id: "res-2", status: "failed" },
      { id: "res-3", status: "flaky" },
      { id: "res-4", status: "passed" },
    ]);

    const result = await ctrfService.processReport(mockReport, {
      projectId: mockProjectId,
    });

    expect(testAnalysisService.analyzeStoredResults).not.toHaveBeenCalled();
    expect(mockTx.result.update).not.toHaveBeenCalled();
    expect(result.analysis).toBeUndefined();
  });

  it("should include skipped tests in the report data", async () => {
    const reportWithSkipped: CTRFReport = {
      results: {
        tool: { name: "jest", version: "1.0.0" },
        summary: {
          start: Date.now(),
          stop: Date.now() + 1000,
          tests: 2,
          passed: 1,
          failed: 0,
          pending: 0,
          skipped: 1,
          other: 0,
        },
        tests: [
          {
            name: "test passed",
            status: "passed",
            duration: 100,
          },
          {
            name: "test skipped",
            status: "skipped",
            duration: 0,
          },
        ],
        environment: {
          buildNumber: "build-1",
          testEnvironment: "dev",
        },
      },
    };

    mockTx.project.findUnique.mockResolvedValue({
      owner: { analyzeEnabled: false },
    });

    await ctrfService.processReport(reportWithSkipped, {
      projectId: mockProjectId,
    });

    expect(jsonReportService.processReport).toHaveBeenCalledWith(
      expect.objectContaining({
        tests: expect.arrayContaining([
          expect.objectContaining({
            title: "test skipped",
            results: expect.arrayContaining([
              expect.objectContaining({
                status: "skipped",
              }),
            ]),
          }),
        ]),
      }),
      mockProjectId,
    );
  });

  it("should preserve distinct CTRF tests whose names share a TestNG case suffix", async () => {
    const start = Date.parse("2026-05-27T12:46:18Z");
    const reportWithSharedSuffix: CTRFReport = {
      results: {
        tool: { name: "testng", version: "7.0.0" },
        summary: {
          start,
          stop: start + 1000,
          tests: 2,
          passed: 1,
          failed: 1,
          pending: 0,
          skipped: 0,
          other: 0,
        },
        tests: [
          {
            name: "VerifyCheckoutPageNavigationForLoggedInUser_RT_TS61TC01",
            status: "passed",
            duration: 100,
            filePath:
              "TestScriptRepository.checkout.VerifyCheckoutPageNavigationForLoggedInUser_RT_TS61TC01",
          },
          {
            name: "VerifyErrorMessageForInvalidCreditCardNumber_RT_TS27TC01",
            status: "failed",
            duration: 200,
            filePath:
              "TestScriptRepository.checkout.VerifyErrorMessageForInvalidCreditCardNumber_RT_TS27TC01",
            message: "Expected message",
          },
        ],
        environment: {
          buildNumber: "testng-build",
          testEnvironment: "local",
        },
      },
    };

    mockTx.project.findUnique.mockResolvedValue({
      owner: { analyzeEnabled: false },
    });

    await ctrfService.processReport(reportWithSharedSuffix, {
      projectId: mockProjectId,
    });

    const [reportData] = (jsonReportService.processReport as jest.Mock).mock
      .calls[0];
    expect(reportData.tests).toEqual([
      expect.objectContaining({
        title: "VerifyCheckoutPageNavigationForLoggedInUser_RT_TS61TC01",
        custom_id:
          "TestScriptRepository.checkout.VerifyCheckoutPageNavigationForLoggedInUser_RT_TS61TC01::default::VerifyCheckoutPageNavigationForLoggedInUser_RT_TS61TC01",
        results: [
          expect.objectContaining({
            startTime: new Date(start),
          }),
        ],
      }),
      expect.objectContaining({
        title: "VerifyErrorMessageForInvalidCreditCardNumber_RT_TS27TC01",
        custom_id:
          "TestScriptRepository.checkout.VerifyErrorMessageForInvalidCreditCardNumber_RT_TS27TC01::default::VerifyErrorMessageForInvalidCreditCardNumber_RT_TS27TC01",
        results: [
          expect.objectContaining({
            startTime: new Date(start + 1),
          }),
        ],
      }),
    ]);
  });

  it("should pass executionType from CTRF environment to report data", async () => {
    const reportWithExecutionType: CTRFReport = {
      ...mockReport,
      results: {
        ...mockReport.results,
        environment: {
          ...mockReport.results.environment,
          executionType: "  release  ",
        },
      },
    };

    mockTx.project.findUnique.mockResolvedValue({
      owner: { analyzeEnabled: false },
    });

    await ctrfService.processReport(reportWithExecutionType, {
      projectId: mockProjectId,
    });

    expect(jsonReportService.processReport).toHaveBeenCalledWith(
      expect.objectContaining({ executionType: "release" }),
      mockProjectId,
    );
  });

  it("should omit executionType when CTRF environment does not provide it", async () => {
    mockTx.project.findUnique.mockResolvedValue({
      owner: { analyzeEnabled: false },
    });

    await ctrfService.processReport(mockReport, {
      projectId: mockProjectId,
    });

    expect(jsonReportService.processReport).toHaveBeenCalledWith(
      expect.not.objectContaining({ executionType: expect.anything() }),
      mockProjectId,
    );
  });

  it("normalizes canonical CTRF modal enrichment metadata", () => {
    const transformed = ctrfService.transformCtrfTest(
      {
        name: "failed checkout",
        status: "failed",
        duration: 100,
        message: "checkout failed",
        trace: "at checkout.spec.ts:12:3",
        filePath: "checkout.spec.ts",
        meta: {
          logs: ["opening checkout", "submit failed"],
          sourceSnippet: {
            path: "checkout.spec.ts",
            text: "await page.goto('/');\nawait checkout.open();\nawait submit.click();",
            startLine: 10,
            failingLine: 12,
          },
          generatedTestCase: "test('checkout', async () => {});",
        },
      },
      Date.parse("2026-08-19T10:00:00Z"),
      0,
    );

    expect(transformed.results[0]).toEqual(
      expect.objectContaining({
        logs: ["opening checkout", "submit failed"],
        sourceSnippet: {
          path: "checkout.spec.ts",
          text: "await page.goto('/');\nawait checkout.open();\nawait submit.click();",
          startLine: 10,
          failingLine: 12,
        },
        generatedTestCase: "test('checkout', async () => {});",
      }),
    );
  });
});
