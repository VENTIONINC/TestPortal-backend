import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { DailyExecutionMetrics } from "@/types/dashboard";

type MockChartDefaults = {
  defaults: {
    color?: string;
    font: {
      family?: string;
      size?: number;
    };
  };
};

const mockRenderToBuffer = jest.fn<() => Promise<Buffer>>();
const mockRegisterFont = jest.fn();
const mockExistsSync = jest.fn(
  (fontPath: string) =>
    fontPath === "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
);
let chartCanvasOptions:
  | {
      chartCallback?: (chartJs: MockChartDefaults) => void;
    }
  | undefined;

jest.mock("node:fs", () => ({
  __esModule: true,
  default: {
    existsSync: mockExistsSync,
  },
}));

jest.mock("chartjs-node-canvas", () => ({
  ChartJSNodeCanvas: jest.fn().mockImplementation((options) => {
    chartCanvasOptions = options as typeof chartCanvasOptions;

    return {
      renderToBuffer: mockRenderToBuffer,
      registerFont: mockRegisterFont,
    };
  }),
}));

import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { chartRendererService } from "@/services/chartRendererService";

describe("chartRendererService", () => {
  beforeEach(() => {
    mockRenderToBuffer.mockReset();
    mockRenderToBuffer.mockResolvedValue(Buffer.from("png-buffer"));
  });

  it("configures Chart.js defaults and registers a runtime font", () => {
    expect(ChartJSNodeCanvas as unknown as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 1000,
        height: 500,
        backgroundColour: "white",
        chartCallback: expect.any(Function),
      }),
    );
    expect(mockRegisterFont).toHaveBeenCalledWith(
      "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
      { family: "PDF Export Sans" },
    );

    expect(chartCanvasOptions?.chartCallback).toBeDefined();

    const chartJs: MockChartDefaults = {
      defaults: {
        font: {},
      },
    };

    chartCanvasOptions?.chartCallback?.(chartJs);

    expect(chartJs.defaults.color).toBe("#111827");
    expect(chartJs.defaults.font.family).toContain("PDF Export Sans");
    expect(chartJs.defaults.font.size).toBe(12);
  });

  it("renders runs donut chart and returns PNG buffer", async () => {
    const result = await chartRendererService.renderRunsDonut(12, 2);

    expect(result).toEqual(Buffer.from("png-buffer"));
    expect(mockRenderToBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "doughnut",
        data: expect.objectContaining({
          labels: ["Passed", "Failed"],
          datasets: expect.arrayContaining([
            expect.objectContaining({
              data: [10, 2],
              backgroundColor: ["#22c55e", "#f97316"],
              borderWidth: 0,
            }),
          ]),
        }),
      }),
    );
  });

  it("renders runs donut chart with zero passed when failed exceeds total", async () => {
    await chartRendererService.renderRunsDonut(3, 5);

    expect(mockRenderToBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "doughnut",
        data: expect.objectContaining({
          labels: ["Passed", "Failed"],
          datasets: expect.arrayContaining([
            expect.objectContaining({
              data: [0, 5],
              backgroundColor: ["#22c55e", "#f97316"],
              borderWidth: 0,
            }),
          ]),
        }),
        options: expect.objectContaining({
          responsive: false,
          cutout: "70%",
          plugins: expect.objectContaining({
            legend: expect.objectContaining({
              display: true,
              position: "bottom",
              labels: expect.objectContaining({
                font: expect.objectContaining({
                  family: expect.stringContaining("PDF Export Sans"),
                }),
              }),
            }),
          }),
        }),
      }),
    );
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
        options: expect.objectContaining({
          scales: expect.objectContaining({
            x: expect.objectContaining({
              ticks: expect.objectContaining({
                font: expect.objectContaining({
                  family: expect.stringContaining("PDF Export Sans"),
                }),
              }),
            }),
            y: expect.objectContaining({
              ticks: expect.objectContaining({
                font: expect.objectContaining({
                  family: expect.stringContaining("PDF Export Sans"),
                }),
              }),
            }),
          }),
        }),
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
        options: expect.objectContaining({
          plugins: expect.objectContaining({
            legend: expect.objectContaining({
              labels: expect.objectContaining({
                font: expect.objectContaining({
                  family: expect.stringContaining("PDF Export Sans"),
                }),
              }),
            }),
          }),
        }),
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
        options: expect.objectContaining({
          plugins: expect.objectContaining({
            legend: expect.objectContaining({
              labels: expect.objectContaining({
                font: expect.objectContaining({
                  family: expect.stringContaining("PDF Export Sans"),
                }),
              }),
            }),
          }),
        }),
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
