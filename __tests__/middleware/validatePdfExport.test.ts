// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { NextFunction, Request, Response } from "express";
import { validatePdfExport } from "@/middleware/validatePdfExport";

type MiddlewareResponseMock = Response & {
  statusCode: number;
  body?: unknown;
  locals: Record<string, unknown>;
};

function createResMock() {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    locals: {} as Record<string, unknown>,
    status(this: MiddlewareResponseMock, code: number) {
      this.statusCode = code;
      return this;
    },
    json(this: MiddlewareResponseMock, payload: unknown) {
      this.body = payload;
      return this;
    },
  } as MiddlewareResponseMock;

  return response;
}

describe("validatePdfExport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 INVALID_PARAMS when required field is missing", () => {
    const req = {
      body: {
        environment: "staging",
        executionType: "Nightly",
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
        granularity: "daily",
      },
    } as Request;
    const res = createResMock();
    const next = jest.fn() as NextFunction;

    validatePdfExport(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      error: "INVALID_PARAMS",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 400 INVALID_PARAMS when periodEnd is before periodStart", () => {
    const req = {
      body: {
        project: "Project A",
        environment: "staging",
        executionType: "Nightly",
        periodStart: "2026-02-01",
        periodEnd: "2026-01-01",
        granularity: "daily",
      },
    } as Request;
    const res = createResMock();
    const next = jest.fn() as NextFunction;

    validatePdfExport(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      error: "INVALID_PARAMS",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 400 PERIOD_TOO_LARGE when period exceeds 365 days", () => {
    const req = {
      body: {
        project: "Project A",
        environment: "staging",
        executionType: "Nightly",
        periodStart: "2024-01-01",
        periodEnd: "2026-01-31",
        granularity: "daily",
      },
    } as Request;
    const res = createResMock();
    const next = jest.fn() as NextFunction;

    validatePdfExport(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: "PERIOD_TOO_LARGE",
      message: "Export period cannot exceed 365 days",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next and sets res.locals.exportParams for valid payload", () => {
    const req = {
      body: {
        project: "Project A",
        environment: "staging",
        executionType: "Nightly",
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
        granularity: "daily",
      },
    } as Request;
    const res = createResMock();
    const next = jest.fn() as NextFunction;

    validatePdfExport(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.locals.exportParams).toEqual({
      ...req.body,
      includeAiInsights: false,
    });
  });

  it("accepts ISO datetime input and normalizes dates", () => {
    const req = {
      body: {
        project: "92efb159-ccc7-43a0-8a1d-20eeea442824",
        environment: "staging",
        executionType: "all",
        periodStart: "2026-01-29T21:59:05.987Z",
        periodEnd: "2026-02-27T21:59:05.987Z",
        granularity: "daily",
      },
    } as Request;
    const res = createResMock();
    const next = jest.fn() as NextFunction;

    validatePdfExport(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.locals.exportParams).toEqual({
      ...req.body,
      includeAiInsights: false,
      periodStart: "2026-01-29",
      periodEnd: "2026-02-27",
    });
  });

  it("accepts includeAiInsights when explicitly provided", () => {
    const req = {
      body: {
        project: "Project A",
        environment: "staging",
        executionType: "Nightly",
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
        granularity: "daily",
        includeAiInsights: true,
      },
    } as Request;
    const res = createResMock();
    const next = jest.fn() as NextFunction;

    validatePdfExport(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.locals.exportParams).toEqual(req.body);
  });

  it("returns INVALID_PARAMS for malformed date instead of PERIOD_TOO_LARGE", () => {
    const req = {
      body: {
        project: "Project A",
        environment: "staging",
        executionType: "Nightly",
        periodStart: "not-a-date",
        periodEnd: "2026-01-31T00:00:00.000Z",
        granularity: "daily",
      },
    } as Request;
    const res = createResMock();
    const next = jest.fn() as NextFunction;

    validatePdfExport(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      error: "INVALID_PARAMS",
    });
    expect(res.body).not.toMatchObject({
      error: "PERIOD_TOO_LARGE",
    });
    expect(next).not.toHaveBeenCalled();
  });
});
