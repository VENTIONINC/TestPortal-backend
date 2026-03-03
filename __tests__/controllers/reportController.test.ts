import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { Request, Response } from "express";
import { reportController } from "@/controllers/reportController";
import { reportService, ReportGenerationError } from "@/services/reportService";

jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe("reportController.exportPdf", () => {
  const validParams = {
    project: "ProjectA",
    environment: "staging",
    executionType: "Nightly",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    granularity: "daily" as const,
  };

  const createReqRes = () => {
    const headers: Record<string, string> = {};

    const req = {
      setTimeout: jest.fn(),
    } as unknown as Request;

    const res = {
      locals: {
        exportParams: validParams,
      },
      headersSent: false,
      statusCode: 200,
      setHeader: jest.fn((key: string, value: string) => {
        headers[key] = value;
      }),
      status: jest.fn(function setStatus(this: Response, code: number) {
        (this as Response & { statusCode: number }).statusCode = code;
        return this;
      }),
      json: jest.fn(function sendJson(this: Response) {
        (this as Response & { headersSent: boolean }).headersSent = true;
        return this;
      }),
    } as unknown as Response & {
      statusCode: number;
      headersSent: boolean;
      locals: Record<string, unknown>;
    };

    return { req, res, headers };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sets PDF headers and pipes stream on success", async () => {
    const pipe = jest.fn();
    const end = jest.fn();
    jest.spyOn(reportService, "generatePdf").mockResolvedValue({
      pipe,
      end,
    } as unknown as PDFKit.PDFDocument);

    const { req, res, headers } = createReqRes();
    await reportController.exportPdf(req, res);

    expect(headers["Content-Type"]).toBe("application/pdf");
    expect(headers["Content-Disposition"]).toContain(
      'attachment; filename="ProjectA-staging-Nightly-2026-01-01_2026-01-31.pdf"',
    );
    expect(pipe).toHaveBeenCalledWith(res);
    expect(end).toHaveBeenCalledTimes(1);
  });

  it("returns DATA_FETCH_FAILED on data fetch error", async () => {
    jest
      .spyOn(reportService, "generatePdf")
      .mockRejectedValue(
        new ReportGenerationError("DATA_FETCH_FAILED", "failed"),
      );

    const { req, res } = createReqRes();
    await reportController.exportPdf(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "DATA_FETCH_FAILED" });
  });

  it("returns 404 NOT_FOUND when project is missing", async () => {
    jest
      .spyOn(reportService, "generatePdf")
      .mockRejectedValue(new ReportGenerationError("NOT_FOUND", "missing"));

    const { req, res } = createReqRes();
    await reportController.exportPdf(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "NOT_FOUND" });
  });

  it("returns 400 INVALID_PARAMS when middleware data missing", async () => {
    const { req, res } = createReqRes();
    res.locals = {};

    await reportController.exportPdf(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "INVALID_PARAMS" });
  });
});
