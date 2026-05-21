// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import {
  jsonReportService,
  type ReportData,
} from "@/services/jsonReportService";

// Mock the database client and logger
jest.mock("@/prisma/client", () => {
  const mockClient = {
    execution: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    spec: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    result: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    resultError: {
      create: jest.fn(),
    },
  };

  // Mock $transaction to simply execute the callback with the mockClient
  (mockClient as any).$transaction = jest.fn(async (callback) => {
    return await callback(mockClient);
  });

  return {
    dbClient: mockClient,
  };
});

jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }),
}));

jest.mock("@/lib/parse-error", () => ({
  parseStackTrace: jest.fn(() => ({
    type: "TestError",
    message: "Mock error",
    callLog: [],
    callStack: [],
    testAssertion: "mock assertion",
    expectedPattern: "expected",
    receivedString: "received",
    location: { file: "test.js", line: 1 },
  })),
}));

const { dbClient } = require("@/prisma/client");

describe("jsonReportService with optional runId", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock execution creation
    dbClient.execution.findFirst.mockResolvedValue(null);
    dbClient.execution.create.mockResolvedValue({
      id: 1,
      name: "test-execution",
      type: "nightly",
      environment: "test",
      version: "1.0.0",
      startedAt: new Date(),
    });

    // Mock spec creation
    dbClient.spec.findFirst.mockResolvedValue(null);
    dbClient.spec.create.mockResolvedValue({
      id: 1,
      key: "TEST_SPEC",
      file: "test.spec.js",
      title: "Test Spec",
      tags: "[]",
      annotations: "[]",
    });

    // Mock result creation
    dbClient.result.findFirst.mockResolvedValue(null);
    dbClient.result.create.mockResolvedValue({
      id: 1,
      specId: 1,
      executionId: 1,
      retry: 0,
      status: "passed",
      duration: 1000,
      startTime: new Date(),
    });
  });

  const mockTestData = {
    env: "test",
    provider: "TEST",
    version: "1.0.0",
    stats: {
      startTime: new Date("2025-05-14T10:30:00Z"),
    },
    tests: [
      {
        title: "TEST_SPEC Test Case",
        location: {
          file: "test.spec.js",
          line: 10,
        },
        results: [
          {
            retry: 0,
            status: "passed",
            duration: 1000,
            startTime: "2025-05-14T10:30:00Z",
            workerIndex: 0,
          },
        ],
      },
    ],
  };

  it("should process report with provided runId", async () => {
    const reportData = {
      ...mockTestData,
      runId: "PROVIDED_RUN_ID",
    };

    const result = await jsonReportService.processReport(
      reportData,
      "b4225bdf-9e2b-43f9-8f13-5bb6f5079176",
    );

    expect(result.success).toBe(true);
    expect(result.executionId).toBe(1);
    expect(result.specsProcessed).toBe(1);

    // Verify execution was created with the provided runId
    expect(dbClient.execution.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "PROVIDED_RUN_ID",
      }),
    });
  });

  it("should generate fallback identifier when runId is not provided", async () => {
    const reportData = {
      ...mockTestData,
      // No runId provided
    };

    const result = await jsonReportService.processReport(
      reportData,
      "b4225bdf-9e2b-43f9-8f13-5bb6f5079176",
    );

    expect(result.success).toBe(true);
    expect(result.executionId).toBe(1);
    expect(result.specsProcessed).toBe(1);

    // Verify execution was created with a generated identifier
    expect(dbClient.execution.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: expect.stringMatching(
          /^TEST_1\.0\.0_\d{4}-\d{2}-\d{2}_(NIGHT|MORNING|AFTERNOON|EVENING)$/,
        ),
      }),
    });
  });

  it("should use custom identifier strategy", async () => {
    const reportData = {
      ...mockTestData,
      identifierStrategy: "hourly" as const,
      // No runId provided
    };

    const result = await jsonReportService.processReport(
      reportData,
      "b4225bdf-9e2b-43f9-8f13-5bb6f5079176",
    );

    expect(result.success).toBe(true);

    // Verify execution was created with hourly strategy identifier
    expect(dbClient.execution.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: expect.stringMatching(/^TEST_1\.0\.0_\d{4}-\d{2}-\d{2}_\d{2}$/),
      }),
    });
  });

  it("should handle missing env and version gracefully", async () => {
    const reportData = {
      tests: mockTestData.tests,
      stats: mockTestData.stats,
      provider: mockTestData.provider,
      // No env, version, or runId
    };

    const result = await jsonReportService.processReport(
      reportData,
      "b4225bdf-9e2b-43f9-8f13-5bb6f5079176",
    );

    expect(result.success).toBe(true);

    // Verify execution was created with "unknown" defaults
    expect(dbClient.execution.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: expect.stringMatching(
          /^UNKNOWN_UNKNOWN_\d{4}-\d{2}-\d{2}_(NIGHT|MORNING|AFTERNOON|EVENING)$/,
        ),
      }),
    });
  });

  it("should persist extracted Playwright artifact metadata", async () => {
    const [testSpec] = mockTestData.tests;
    if (!testSpec) throw new Error("Expected mock test spec");
    const [testResult] = testSpec.results;
    if (!testResult) throw new Error("Expected mock test result");
    const reportData: ReportData = {
      ...mockTestData,
      tests: [
        {
          ...testSpec,
          results: [
            {
              ...testResult,
              attachments: [
                {
                  name: "s3-artifact",
                  contentType: "application/x-s3-artifact",
                  path: "test-results/test-artifact.zip",
                },
              ],
            },
          ],
        },
      ],
    };

    await jsonReportService.processReport(
      reportData,
      "b4225bdf-9e2b-43f9-8f13-5bb6f5079176",
    );

    expect(dbClient.result.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        artifactProvider: "s3",
        artifactObjectKey:
          "playwright-artifacts/test.spec.js/TEST_SPEC-Test-Case/1747218600000-0-test-artifact.zip",
      }),
    });
  });

  it("should not require artifact metadata when none is extracted", async () => {
    await jsonReportService.processReport(
      mockTestData,
      "b4225bdf-9e2b-43f9-8f13-5bb6f5079176",
    );

    expect(dbClient.result.create).toHaveBeenCalledWith({
      data: expect.not.objectContaining({
        artifactProvider: expect.any(String),
        artifactObjectKey: expect.any(String),
      }),
    });
  });
});
