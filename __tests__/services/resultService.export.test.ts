import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { resultService } from "@/services/resultService";
import { resultModel } from "@/models/resultModel";
import type { AnalysisExportRow } from "@/models/resultModel";

jest.mock("@/models/resultModel");

const mockResultModel = resultModel as jest.Mocked<typeof resultModel>;

describe("resultService.exportAnalysisJsonl", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should throw when projectId is missing", async () => {
    await expect(
      resultService.exportAnalysisJsonl({
        projectId: "",
        dateFrom: "2025-01-01",
        dateTo: "2025-01-02",
      }),
    ).rejects.toThrow("Project ID is required");
  });

  it("should throw when dateFrom is invalid", async () => {
    await expect(
      resultService.exportAnalysisJsonl({
        projectId: "project-1",
        dateFrom: "invalid",
        dateTo: "2025-01-02",
      }),
    ).rejects.toThrow("dateFrom is invalid");
  });

  it("should throw when dateTo is invalid", async () => {
    await expect(
      resultService.exportAnalysisJsonl({
        projectId: "project-1",
        dateFrom: "2025-01-01",
        dateTo: "invalid",
      }),
    ).rejects.toThrow("dateTo is invalid");
  });

  it("should pass inclusive date range for date-only inputs", async () => {
    mockResultModel.findForAnalysisExport.mockResolvedValue([]);

    const dateFrom = "2025-01-05";
    const dateTo = "2025-01-10";

    await resultService.exportAnalysisJsonl({
      projectId: "project-1",
      dateFrom,
      dateTo,
    });

    const expectedFrom = new Date(dateFrom);
    const baseTo = new Date(dateTo);
    const expectedTo = new Date(
      baseTo.getFullYear(),
      baseTo.getMonth(),
      baseTo.getDate() + 1,
    );

    expect(mockResultModel.findForAnalysisExport).toHaveBeenCalledWith({
      projectId: "project-1",
      dateFrom: expectedFrom,
      dateTo: expectedTo,
    });
  });

  it("should not extend dateTo when time is provided", async () => {
    mockResultModel.findForAnalysisExport.mockResolvedValue([]);

    const dateFrom = "2025-01-05T00:00:00Z";
    const dateTo = "2025-01-10T12:30:00Z";

    await resultService.exportAnalysisJsonl({
      projectId: "project-1",
      dateFrom,
      dateTo,
    });

    expect(mockResultModel.findForAnalysisExport).toHaveBeenCalledWith({
      projectId: "project-1",
      dateFrom: new Date(dateFrom),
      dateTo: new Date(dateTo),
    });
  });

  it("should build JSONL with metadata and feedback overrides", async () => {
    const row: AnalysisExportRow = {
      id: "result-1",
      status: "failed",
      duration: 1200,
      retry: 0,
      reportPortalLink: null,
      startTime: new Date("2025-01-05T10:00:00Z"),
      analysisStatus: "failed",
      analysisCategory: "bug",
      analysisConfidence: 0.4,
      analysisConclusion: "ai conclusion",
      analysisErrorQuality: 4,
      analysisErrorQualityConclusion: "error quality",
      analysisReviewedAt: new Date("2025-01-06T10:00:00Z"),
      analysisReviewedById: "user-1",
      analysisFeedbackCategory: "infra",
      analysisFeedbackConfidence: 0.9,
      analysisFeedbackConclusion: "human conclusion",
      spec: {
        id: "spec-1",
        key: "SPEC-1",
        file: "spec.ts",
        title: "Spec Title",
        tags: '["smoke","ui"]',
      },
      execution: {
        id: "exec-1",
        environment: "staging",
        type: "e2e",
        name: "Run 1",
        version: "1.0.0",
        startedAt: new Date("2025-01-05T09:00:00Z"),
        createdAt: new Date("2025-01-05T09:30:00Z"),
      },
    };

    mockResultModel.findForAnalysisExport.mockResolvedValue([row]);

    const { content } = await resultService.exportAnalysisJsonl({
      projectId: "project-1",
      dateFrom: "2025-01-05",
      dateTo: "2025-01-06",
    });

    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(2);

    expect(lines[0]).toBeDefined();
    const metadata = JSON.parse(lines[0] as string);
    expect(metadata).toMatchObject({
      type: "metadata",
      schemaVersion: "1.0",
      projectId: "project-1",
    });

    expect(lines[1]).toBeDefined();
    const record = JSON.parse(lines[1] as string);
    expect(record.type).toBe("result");
    expect(record.final).toEqual({
      category: "infra",
      confidence: 0.9,
      conclusion: "human conclusion",
    });
    expect(record.ai.category).toBe("bug");
    expect(record.feedback.reviewedById).toBe("user-1");
    expect(record.spec.tags).toEqual(["smoke", "ui"]);
  });
});
