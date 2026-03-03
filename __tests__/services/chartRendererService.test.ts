import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { DailyExecutionMetrics } from "@/types/dashboard";

const mockRenderToBuffer = jest.fn<() => Promise<Buffer>>();

jest.mock("chartjs-node-canvas", () => ({
  ChartJSNodeCanvas: jest.fn().mockImplementation(() => ({
    renderToBuffer: mockRenderToBuffer,
  })),
}));

import { chartRendererService } from "@/services/chartRendererService";

describe("chartRendererService.renderTrendChart", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRenderToBuffer.mockResolvedValue(Buffer.from("png-buffer"));
  });

  it("renders regression runs bar chart", async () => {
    const data: Array<{ date: string; metrics: DailyExecutionMetrics }> = [
      {
        date: "2026-02-12",
        metrics: {
          total: 1740,
          passed: 630,
          failed: 1104,
          skipped: 6,
          duration: 100,
          issues: {
            bug: 2,
            environment: 1,
            script: 0,
            performance: 0,
            other: 1101,
          },
        },
      },
    ];

    await chartRendererService.renderRegressionRunsChart(data);

    expect(mockRenderToBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "bar",
        data: expect.objectContaining({
          labels: ["2026-02-12"],
          datasets: expect.arrayContaining([
            expect.objectContaining({ label: "passed", data: [630] }),
            expect.objectContaining({ label: "failed", data: [1104] }),
            expect.objectContaining({ label: "skipped", data: [6] }),
          ]),
        }),
      }),
    );
  });

  it("renders pass rate bar chart", async () => {
    const data: Array<{ date: string; metrics: DailyExecutionMetrics }> = [
      {
        date: "2026-02-12",
        metrics: {
          total: 1740,
          passed: 630,
          failed: 1104,
          skipped: 6,
          duration: 100,
          issues: {
            bug: 2,
            environment: 1,
            script: 0,
            performance: 0,
            other: 1101,
          },
        },
      },
    ];

    await chartRendererService.renderPassRateChart(data);

    expect(mockRenderToBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "bar",
        data: expect.objectContaining({
          labels: ["2026-02-12"],
          datasets: expect.arrayContaining([
            expect.objectContaining({ label: "passed", data: [630] }),
            expect.objectContaining({ label: "failed", data: [1104] }),
          ]),
        }),
      }),
    );
  });

  it("renders issues categories bar chart", async () => {
    const data: Array<{ date: string; metrics: DailyExecutionMetrics }> = [
      {
        date: "2026-02-12",
        metrics: {
          total: 1740,
          passed: 630,
          failed: 1104,
          skipped: 6,
          duration: 100,
          issues: {
            bug: 2,
            environment: 1,
            script: 0,
            performance: 0,
            other: 1101,
          },
        },
      },
    ];

    await chartRendererService.renderIssuesCategoriesChart(data);

    expect(mockRenderToBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "bar",
        data: expect.objectContaining({
          labels: ["2026-02-12"],
          datasets: expect.arrayContaining([
            expect.objectContaining({ label: "bug", data: [2] }),
            expect.objectContaining({ label: "environment", data: [1] }),
            expect.objectContaining({ label: "script", data: [0] }),
            expect.objectContaining({ label: "performance", data: [0] }),
            expect.objectContaining({ label: "other", data: [1101] }),
          ]),
        }),
      }),
    );
  });
});
