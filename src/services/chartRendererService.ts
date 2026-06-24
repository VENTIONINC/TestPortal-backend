// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import type { DailyExecutionMetrics } from "@/types/dashboard";

const CHART_FONT_FAMILY = "PDF Export Sans";
const CHART_FONT_STACK = `"${CHART_FONT_FAMILY}", "DejaVu Sans", Arial, Helvetica, sans-serif`;
const CHART_FONT_PATHS = [
  process.env.PDF_EXPORT_CHART_FONT_PATH,
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
  "/System/Library/Fonts/Supplemental/Arial.ttf",
  "/Library/Fonts/Arial.ttf",
].filter((fontPath): fontPath is string => Boolean(fontPath));

function resolveChartFontPath(): string | null {
  return CHART_FONT_PATHS.find((fontPath) => fs.existsSync(fontPath)) ?? null;
}

const chartCanvas = new ChartJSNodeCanvas({
  width: 1000,
  height: 500,
  backgroundColour: "white",
  chartCallback: (ChartJS) => {
    ChartJS.defaults.color = "#111827";
    ChartJS.defaults.font.family = CHART_FONT_STACK;
    ChartJS.defaults.font.size = 12;
  },
});

const chartFontPath = resolveChartFontPath();

if (chartFontPath) {
  chartCanvas.registerFont(chartFontPath, {
    family: CHART_FONT_FAMILY,
  });
}

function getAxisOptions() {
  return {
    beginAtZero: true,
    ticks: {
      font: {
        family: CHART_FONT_STACK,
      },
    },
  };
}

function getLegendOptions(position: "top" | "bottom") {
  return {
    display: true,
    position,
    labels: {
      font: {
        family: CHART_FONT_STACK,
      },
    },
  };
}

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
            ...getLegendOptions("top"),
            align: "end" as const,
          },
        },
        scales: {
          x: getAxisOptions(),
          y: getAxisOptions(),
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
            ...getLegendOptions("top"),
            align: "end" as const,
          },
        },
        scales: {
          x: getAxisOptions(),
          y: getAxisOptions(),
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
            ...getLegendOptions("top"),
            align: "end" as const,
          },
        },
        scales: {
          x: getAxisOptions(),
          y: getAxisOptions(),
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
          legend: getLegendOptions("bottom"),
          title: {
            display: false,
          },
        },
      },
    };

    return chartCanvas.renderToBuffer(configuration);
  },
};
