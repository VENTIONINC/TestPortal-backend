import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import fs from "node:fs";
import { AI_INSIGHTS_FALLBACK_TEXT } from "@/services/insightsService";

type MockPdfDoc = {
  page: {
    width: number;
    height: number;
    margins: {
      top: number;
      left: number;
      right: number;
    };
  };
  y: number;
  fontSize: jest.Mock;
  text: jest.Mock;
  moveDown: jest.Mock;
  image: jest.Mock;
  moveTo: jest.Mock;
  lineTo: jest.Mock;
  stroke: jest.Mock;
  bufferedPageRange: jest.Mock;
  switchToPage: jest.Mock;
  addPage: jest.Mock;
  save: jest.Mock;
  restore: jest.Mock;
  opacity: jest.Mock;
  fillColor: jest.Mock;
  widthOfString: jest.Mock;
  end: jest.Mock;
};

const createMockDoc = (): MockPdfDoc => {
  const doc = {
    page: {
      width: 595,
      height: 842,
      margins: {
        top: 50,
        left: 50,
        right: 50,
      },
    },
    y: 100,
    fontSize: jest.fn(),
    text: jest.fn(),
    moveDown: jest.fn(),
    image: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    bufferedPageRange: jest.fn(() => ({ start: 0, count: 1 })),
    switchToPage: jest.fn(),
    addPage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    opacity: jest.fn(),
    fillColor: jest.fn(),
    widthOfString: jest.fn(() => 80),
    end: jest.fn(),
  };

  doc.fontSize.mockReturnValue(doc);
  doc.text.mockReturnValue(doc);
  doc.moveDown.mockReturnValue(doc);
  doc.image.mockReturnValue(doc);
  doc.moveTo.mockReturnValue(doc);
  doc.lineTo.mockReturnValue(doc);
  doc.stroke.mockReturnValue(doc);
  doc.switchToPage.mockReturnValue(doc);
  doc.addPage.mockReturnValue(doc);
  doc.save.mockReturnValue(doc);
  doc.restore.mockReturnValue(doc);
  doc.opacity.mockReturnValue(doc);
  doc.fillColor.mockReturnValue(doc);

  return doc;
};

let mockDoc = createMockDoc();

jest.mock("pdfkit", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockDoc),
}));

import PDFDocument from "pdfkit";
import { pdfBuilderService } from "@/services/pdfBuilderService";

describe("pdfBuilderService.buildPdf", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDoc = createMockDoc();
  });

  it("returns a PDF document stream object and does not write to disk", () => {
    const writeStreamSpy = jest.spyOn(fs, "createWriteStream");

    const result = pdfBuilderService.buildPdf({
      regressionRunsChartBuffer: Buffer.from("regression"),
      issuesCategoriesChartBuffer: Buffer.from("issues"),
      passRateChartBuffer: Buffer.from("pass-rate"),
      testRunsDonutBuffer: Buffer.from("runs-donut"),
      kpis: { totalRuns: 20, failedRuns: 5, passRate: 95 },
      failureCauses: {
        bug: 1,
        environment: 1,
        script: 0,
        performance: 0,
        other: 0,
      },
      insightsText: null,
      filters: {
        project: "ProjectA",
        environment: "staging",
        executionType: "Nightly",
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
        granularity: "daily",
        includeAiInsights: false,
      },
    });

    expect(result).toBe(mockDoc as unknown as PDFKit.PDFDocument);
    expect(PDFDocument as unknown as jest.Mock).toHaveBeenCalledWith({
      size: "A4",
      margin: 50,
      bufferPages: true,
    });
    expect(writeStreamSpy).not.toHaveBeenCalled();

    writeStreamSpy.mockRestore();
  });

  it("renders required sections and finalizes PDF", () => {
    pdfBuilderService.buildPdf({
      regressionRunsChartBuffer: Buffer.from("regression"),
      issuesCategoriesChartBuffer: Buffer.from("issues"),
      passRateChartBuffer: Buffer.from("pass-rate"),
      testRunsDonutBuffer: Buffer.from("runs-donut"),
      kpis: { totalRuns: 35, failedRuns: 4, passRate: 88 },
      failureCauses: {
        bug: 4,
        environment: 2,
        script: 1,
        performance: 1,
        other: 0,
      },
      insightsText: null,
      filters: {
        project: "ProjectA",
        environment: "prod",
        executionType: "Release",
        periodStart: "2026-02-01",
        periodEnd: "2026-02-10",
        granularity: "daily",
        includeAiInsights: false,
      },
    });

    expect(mockDoc.text).toHaveBeenCalledWith("Summary KPIs", {
      underline: true,
    });
    expect(
      mockDoc.text.mock.calls.some((call) => call[0] === "Test runs"),
    ).toBe(true);
    expect(
      mockDoc.text.mock.calls.some((call) => call[0] === "Pass rate"),
    ).toBe(true);
    expect(
      mockDoc.text.mock.calls.some(
        (call) => call[0] === "History regression runs",
      ),
    ).toBe(true);
    expect(
      mockDoc.text.mock.calls.some((call) => call[0] === "Issues categories"),
    ).toBe(true);
    expect(mockDoc.text).toHaveBeenCalledWith("Failure Root-Cause Breakdown", {
      underline: true,
    });
    expect(mockDoc.text).toHaveBeenCalledWith("Failed Runs: 4");
    const imageCalls = mockDoc.image.mock.calls;
    expect(
      imageCalls.some(
        (call) =>
          Buffer.isBuffer(call[0]) && Buffer.from("runs-donut").equals(call[0]),
      ),
    ).toBe(true);
    expect(
      imageCalls.some(
        (call) =>
          Buffer.isBuffer(call[0]) && Buffer.from("issues").equals(call[0]),
      ),
    ).toBe(true);
    expect(
      imageCalls.some(
        (call) =>
          Buffer.isBuffer(call[0]) && Buffer.from("pass-rate").equals(call[0]),
      ),
    ).toBe(true);
    expect(
      imageCalls.some(
        (call) =>
          Buffer.isBuffer(call[0]) && Buffer.from("regression").equals(call[0]),
      ),
    ).toBe(true);

    const generatedOnCall = mockDoc.text.mock.calls.find(
      (call) =>
        typeof call[0] === "string" && call[0].startsWith("Generated on "),
    );
    expect(generatedOnCall).toBeDefined();
    expect(
      mockDoc.text.mock.calls.some(
        (call) => typeof call[0] === "string" && call[0] === "Page 1 of 1",
      ),
    ).toBe(true);
  });

  it("renders AI insights section when text is provided", () => {
    pdfBuilderService.buildPdf({
      regressionRunsChartBuffer: Buffer.from("regression"),
      issuesCategoriesChartBuffer: Buffer.from("issues"),
      passRateChartBuffer: Buffer.from("pass-rate"),
      testRunsDonutBuffer: Buffer.from("runs-donut"),
      kpis: { totalRuns: 35, failedRuns: 4, passRate: 88 },
      failureCauses: {
        bug: 4,
        environment: 2,
        script: 1,
        performance: 1,
        other: 0,
      },
      insightsText: "Pass rate remained stable with a drop in total runs on 2026-02-05.",
      filters: {
        project: "ProjectA",
        environment: "prod",
        executionType: "Release",
        periodStart: "2026-02-01",
        periodEnd: "2026-02-10",
        granularity: "daily",
        includeAiInsights: true,
      },
    });

    expect(mockDoc.text.mock.calls.some((call) => call[0] === "AI Insights")).toBe(
      true,
    );
    expect(
      mockDoc.text.mock.calls.some(
        (call) => call[0] === "Generated by AI · GPT-4.1-mini",
      ),
    ).toBe(true);
  });

  it("styles the fallback insights message distinctly", () => {
    pdfBuilderService.buildPdf({
      regressionRunsChartBuffer: Buffer.from("regression"),
      issuesCategoriesChartBuffer: Buffer.from("issues"),
      passRateChartBuffer: Buffer.from("pass-rate"),
      testRunsDonutBuffer: Buffer.from("runs-donut"),
      kpis: { totalRuns: 35, failedRuns: 4, passRate: 88 },
      failureCauses: {
        bug: 4,
        environment: 2,
        script: 1,
        performance: 1,
        other: 0,
      },
      insightsText: AI_INSIGHTS_FALLBACK_TEXT,
      filters: {
        project: "ProjectA",
        environment: "prod",
        executionType: "Release",
        periodStart: "2026-02-01",
        periodEnd: "2026-02-10",
        granularity: "daily",
        includeAiInsights: true,
      },
    });

    expect(mockDoc.fillColor).toHaveBeenCalledWith("#6b7280");
    expect(
      mockDoc.text.mock.calls.some(
        (call) => call[0] === AI_INSIGHTS_FALLBACK_TEXT,
      ),
    ).toBe(true);
  });

  it("renders footer for buffered range with non-zero start", () => {
    mockDoc.bufferedPageRange.mockReturnValue({ start: 2, count: 2 });

    pdfBuilderService.buildPdf({
      regressionRunsChartBuffer: Buffer.from("regression"),
      issuesCategoriesChartBuffer: Buffer.from("issues"),
      passRateChartBuffer: Buffer.from("pass-rate"),
      testRunsDonutBuffer: Buffer.from("runs-donut"),
      kpis: { totalRuns: 10, failedRuns: 2, passRate: 80 },
      failureCauses: {
        bug: 1,
        environment: 1,
        script: 0,
        performance: 0,
        other: 0,
      },
      insightsText: null,
      filters: {
        project: "ProjectA",
        environment: "prod",
        executionType: "Release",
        periodStart: "2026-02-01",
        periodEnd: "2026-02-10",
        granularity: "daily",
        includeAiInsights: false,
      },
    });

    expect(mockDoc.switchToPage).toHaveBeenCalledWith(2);
    expect(mockDoc.switchToPage).toHaveBeenCalledWith(3);
    expect(
      mockDoc.text.mock.calls.some((call) => call[0] === "Page 1 of 2"),
    ).toBe(true);
    expect(
      mockDoc.text.mock.calls.some((call) => call[0] === "Page 2 of 2"),
    ).toBe(true);
  });
});
