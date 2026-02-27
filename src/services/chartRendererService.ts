import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import type {
  DailyExecutionMetrics,
  DashboardGranularity,
} from "@/types/dashboard";

const chartCanvas = new ChartJSNodeCanvas({
  width: 1000,
  height: 500,
  backgroundColour: "white",
});

export const chartRendererService = {
  async renderPassRateChart(
    data: Array<{ date: string; metrics: DailyExecutionMetrics }>,
  ): Promise<Buffer> {
    const labels = data.map((bucket) => bucket.date);

    const configuration = {
      type: "bar" as const,
      data: {
        labels,
        datasets: [
          {
            label: "passed",
            data: data.map((bucket) => bucket.metrics.passed),
            backgroundColor: "#22c55e",
          },
          {
            label: "failed",
            data: data.map((bucket) => bucket.metrics.failed),
            backgroundColor: "#f97316",
          },
        ],
      },
      options: {
        responsive: false,
        plugins: {
          legend: {
            display: true,
            position: "top" as const,
            align: "end" as const,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    };

    return chartCanvas.renderToBuffer(configuration);
  },

  async renderRegressionRunsChart(
    data: Array<{ date: string; metrics: DailyExecutionMetrics }>,
  ): Promise<Buffer> {
    const labels = data.map((bucket) => bucket.date);

    const configuration = {
      type: "bar" as const,
      data: {
        labels,
        datasets: [
          {
            label: "passed",
            data: data.map((bucket) => bucket.metrics.passed),
            backgroundColor: "#22c55e",
          },
          {
            label: "failed",
            data: data.map((bucket) => bucket.metrics.failed),
            backgroundColor: "#f97316",
          },
          {
            label: "skipped",
            data: data.map((bucket) => bucket.metrics.skipped),
            backgroundColor: "#d1d5db",
          },
        ],
      },
      options: {
        responsive: false,
        plugins: {
          legend: {
            display: true,
            position: "top" as const,
            align: "end" as const,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    };

    return chartCanvas.renderToBuffer(configuration);
  },

  async renderIssuesCategoriesChart(
    data: Array<{ date: string; metrics: DailyExecutionMetrics }>,
  ): Promise<Buffer> {
    const labels = data.map((bucket) => bucket.date);

    const configuration = {
      type: "bar" as const,
      data: {
        labels,
        datasets: [
          {
            label: "bug",
            data: data.map((bucket) => bucket.metrics.issues.bug),
            backgroundColor: "#8b5cf6",
          },
          {
            label: "environment",
            data: data.map((bucket) => bucket.metrics.issues.environment),
            backgroundColor: "#d946ef",
          },
          {
            label: "script",
            data: data.map((bucket) => bucket.metrics.issues.script),
            backgroundColor: "#bef264",
          },
          {
            label: "performance",
            data: data.map((bucket) => bucket.metrics.issues.performance),
            backgroundColor: "#38bdf8",
          },
          {
            label: "other",
            data: data.map((bucket) => bucket.metrics.issues.other),
            backgroundColor: "#e5e7eb",
          },
        ],
      },
      options: {
        responsive: false,
        plugins: {
          legend: {
            display: true,
            position: "top" as const,
            align: "end" as const,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    };

    return chartCanvas.renderToBuffer(configuration);
  },

  async renderTrendChart(
    data: Array<{ date: string; metrics: DailyExecutionMetrics }>,
    _granularity: DashboardGranularity,
  ): Promise<Buffer> {
    const labels = data.map((bucket) => bucket.date);

    // CHART CONFIG
    // Total: #6366f1 (blue)
    // Passed: #22c55e (green)
    // Failed: #ef4444 (red)
    // Skipped: #f59e0b (amber)
    const configuration = {
      type: "line" as const,
      data: {
        labels,
        datasets: [
          {
            label: "Total",
            data: data.map((bucket) => bucket.metrics.total),
            borderColor: "#6366f1",
            backgroundColor: "#6366f1",
            tension: 0.25,
          },
          {
            label: "Passed",
            data: data.map((bucket) => bucket.metrics.passed),
            borderColor: "#22c55e",
            backgroundColor: "#22c55e",
            tension: 0.25,
          },
          {
            label: "Failed",
            data: data.map((bucket) => bucket.metrics.failed),
            borderColor: "#ef4444",
            backgroundColor: "#ef4444",
            tension: 0.25,
          },
          {
            label: "Skipped",
            data: data.map((bucket) => bucket.metrics.skipped),
            borderColor: "#f59e0b",
            backgroundColor: "#f59e0b",
            tension: 0.25,
          },
        ],
      },
      options: {
        responsive: false,
        plugins: {
          legend: {
            display: true,
            position: "bottom" as const,
          },
          title: {
            display: false,
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Date",
            },
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Test Count",
            },
          },
        },
      },
    };

    return chartCanvas.renderToBuffer(configuration);
  },

  async renderRunsDonut(
    totalRuns: number,
    failedRuns: number,
  ): Promise<Buffer> {
    const passedRuns = Math.max(totalRuns - failedRuns, 0);

    const configuration = {
      type: "doughnut" as const,
      data: {
        labels: ["Passed", "Failed"],
        datasets: [
          {
            data: [passedRuns, failedRuns],
            backgroundColor: ["#22c55e", "#f97316"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: false,
        cutout: "70%",
        plugins: {
          legend: {
            display: true,
            position: "bottom" as const,
          },
          title: {
            display: false,
          },
        },
      },
    };

    return chartCanvas.renderToBuffer(configuration);
  },
};
