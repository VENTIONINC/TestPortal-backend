import { ctrfService } from "@/services/ctrfService";
import { jsonReportService } from "@/services/jsonReportService";
import { testAnalysisService } from "@/services/testAnalysisService";

// Mock dependencies
jest.mock("@/services/jsonReportService");
jest.mock("@/services/testAnalysisService");
jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock Prisma client
const mockTx = {
  project: {
    findUnique: jest.fn(),
  },
  result: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock("@/prisma/client", () => ({
  dbClient: {
    $transaction: jest.fn((callback) => callback(mockTx)),
  },
}));

describe("ctrfService", () => {
  const mockProjectId = "project-123";
  const mockReport = {
    results: {
      tool: { name: "jest", version: "1.0.0" },
      summary: {
        start: Date.now(),
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
  });

  it("should process report and skip analysis if disabled", async () => {
    mockTx.project.findUnique.mockResolvedValue({
      owner: { analyzeEnabled: false },
    });

    const result = await ctrfService.processReport(mockReport as any, {
      projectId: mockProjectId,
    });

    expect(jsonReportService.processReport).toHaveBeenCalledWith(
      expect.objectContaining({ runId: "build-1" }),
      mockProjectId,
      mockTx,
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

    const result = await ctrfService.processReport(mockReport as any, {
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

    const result = await ctrfService.processReport(mockReport as any, {
      projectId: mockProjectId,
    });

    expect(testAnalysisService.analyzeStoredResults).toHaveBeenCalled();
    expect(mockTx.result.update).not.toHaveBeenCalled();
    expect(result.analysis).toBeUndefined();
  });
});
