import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { reportService, ReportGenerationError } from "@/services/reportService";
import { projectModel } from "@/models/projectModel";
import { dashboardService } from "@/services/dashboardService";
import { chartRendererService } from "@/services/chartRendererService";
import { pdfBuilderService } from "@/services/pdfBuilderService";

describe("reportService.generatePdf", () => {
  const filters = {
    project: "ProjectA",
    environment: "staging",
    executionType: "Nightly",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    granularity: "daily" as const,
  };

  const dashboardResponse = {
    summary: {
      totalRuns: 100,
      failures: 9,
      passRate: 91,
    },
    history: [
      {
        date: "2026-01-01",
        metrics: {
          total: 10,
          passed: 9,
          failed: 1,
          skipped: 0,
          duration: 1000,
          issues: {
            bug: 1,
            environment: 0,
            script: 0,
            performance: 0,
            other: 0,
          },
        },
      },
    ],
    recentExecutions: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("orchestrates dashboard, chart and pdf builder calls", async () => {
    const pdfDoc = { pipe: jest.fn() } as unknown as PDFKit.PDFDocument;

    jest.spyOn(projectModel, "findByName").mockResolvedValue({
      id: "project-1",
      name: "ProjectA",
    } as never);
    jest
      .spyOn(dashboardService, "getDashboard")
      .mockResolvedValue(dashboardResponse);
    jest
      .spyOn(chartRendererService, "renderRegressionRunsChart")
      .mockResolvedValue(Buffer.from("chart"));
    jest
      .spyOn(chartRendererService, "renderIssuesCategoriesChart")
      .mockResolvedValue(Buffer.from("donut"));
    jest
      .spyOn(chartRendererService, "renderPassRateChart")
      .mockResolvedValue(Buffer.from("pass-rate"));
    jest
      .spyOn(chartRendererService, "renderRunsDonut")
      .mockResolvedValue(Buffer.from("runs-donut"));
    jest.spyOn(pdfBuilderService, "buildPdf").mockReturnValue(pdfDoc);

    const result = await reportService.generatePdf(filters);

    expect(projectModel.findByName).toHaveBeenCalledWith("ProjectA");
    expect(dashboardService.getDashboard).toHaveBeenCalledWith(
      "project-1",
      "staging",
      31,
      "Nightly",
      "daily",
    );
    expect(chartRendererService.renderRegressionRunsChart).toHaveBeenCalledWith(
      dashboardResponse.history,
    );
    expect(
      chartRendererService.renderIssuesCategoriesChart,
    ).toHaveBeenCalledWith(dashboardResponse.history);
    expect(chartRendererService.renderPassRateChart).toHaveBeenCalledWith(
      dashboardResponse.history,
    );
    expect(chartRendererService.renderRunsDonut).toHaveBeenCalledWith(100, 9);
    expect(pdfBuilderService.buildPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        kpis: { totalRuns: 100, failedRuns: 9, passRate: 91 },
        regressionRunsChartBuffer: Buffer.from("chart"),
        issuesCategoriesChartBuffer: Buffer.from("donut"),
        passRateChartBuffer: Buffer.from("pass-rate"),
        testRunsDonutBuffer: Buffer.from("runs-donut"),
        filters: expect.objectContaining({
          project: "ProjectA",
        }),
      }),
    );
    expect(result).toBe(pdfDoc);
  });

  it("resolves project by UUID and disables type filter when executionType is all", async () => {
    const uuidFilters = {
      ...filters,
      project: "92efb159-ccc7-43a0-8a1d-20eeea442824",
      executionType: "all",
    };
    const pdfDoc = { pipe: jest.fn() } as unknown as PDFKit.PDFDocument;

    jest.spyOn(projectModel, "findById").mockResolvedValue({
      id: "92efb159-ccc7-43a0-8a1d-20eeea442824",
      name: "ProjectA",
    } as never);
    jest.spyOn(projectModel, "findByName").mockResolvedValue(null);
    jest
      .spyOn(dashboardService, "getDashboard")
      .mockResolvedValue(dashboardResponse);
    jest
      .spyOn(chartRendererService, "renderRegressionRunsChart")
      .mockResolvedValue(Buffer.from("chart"));
    jest
      .spyOn(chartRendererService, "renderIssuesCategoriesChart")
      .mockResolvedValue(Buffer.from("donut"));
    jest
      .spyOn(chartRendererService, "renderPassRateChart")
      .mockResolvedValue(Buffer.from("pass-rate"));
    jest
      .spyOn(chartRendererService, "renderRunsDonut")
      .mockResolvedValue(Buffer.from("runs-donut"));
    jest.spyOn(pdfBuilderService, "buildPdf").mockReturnValue(pdfDoc);

    await reportService.generatePdf(uuidFilters);

    expect(projectModel.findById).toHaveBeenCalledWith(
      "92efb159-ccc7-43a0-8a1d-20eeea442824",
    );
    expect(dashboardService.getDashboard).toHaveBeenCalledWith(
      "92efb159-ccc7-43a0-8a1d-20eeea442824",
      "staging",
      31,
      undefined,
      "daily",
    );
  });

  it("throws NOT_FOUND when project does not exist", async () => {
    jest.spyOn(projectModel, "findByName").mockResolvedValue(null);
    jest.spyOn(projectModel, "findById").mockResolvedValue(null as never);

    await expect(reportService.generatePdf(filters)).rejects.toMatchObject({
      code: "NOT_FOUND",
    } satisfies Partial<ReportGenerationError>);
  });

  it("throws CHART_RENDER_FAILED when chart service fails", async () => {
    jest.spyOn(projectModel, "findByName").mockResolvedValue({
      id: "project-1",
      name: "ProjectA",
    } as never);
    jest
      .spyOn(dashboardService, "getDashboard")
      .mockResolvedValue(dashboardResponse);
    jest
      .spyOn(chartRendererService, "renderRegressionRunsChart")
      .mockRejectedValue(new Error("chart fail"));

    await expect(reportService.generatePdf(filters)).rejects.toMatchObject({
      code: "CHART_RENDER_FAILED",
    } satisfies Partial<ReportGenerationError>);
  });
});
