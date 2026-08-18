// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jsonReportService } from "@/services/jsonReportService";

// Mock the database client and logger
jest.mock("@/prisma/client", () => {
  interface MockClient {
    execution: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    spec: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      createMany: jest.Mock;
    };
    result: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      createMany: jest.Mock;
    };
    resultError: {
      create: jest.Mock;
      createMany: jest.Mock;
    };
    $transaction: jest.Mock;
  }

  const mockClient: MockClient = {
    execution: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    spec: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
    },
    result: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
    },
    resultError: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(
      async (callback: (client: MockClient) => Promise<unknown>) =>
        await callback(mockClient),
    ),
  };

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
    dbClient.spec.findMany.mockImplementation(
      async ({ where }: { where: { key: { in: string[] } } }) =>
        where.key.in.map((key) => ({
          id: `spec-${key}`,
          key,
          file: "test.spec.js",
          title: key,
          tags: [],
          annotations: [],
        })),
    );
    dbClient.spec.create.mockResolvedValue({
      id: 1,
      key: "TEST_SPEC",
      file: "test.spec.js",
      title: "Test Spec",
      tags: [],
      annotations: [],
    });
    dbClient.spec.createMany.mockResolvedValue({ count: 0 });

    // Mock result creation
    dbClient.result.findFirst.mockResolvedValue(null);
    dbClient.result.findMany.mockResolvedValue([]);
    dbClient.result.create.mockResolvedValue({
      id: 1,
      specId: 1,
      executionId: 1,
      retry: 0,
      status: "passed",
      duration: 1000,
      startTime: new Date(),
    });
    dbClient.result.createMany.mockResolvedValue({ count: 0 });
    dbClient.resultError.createMany.mockResolvedValue({ count: 0 });
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

  it("should prefer explicit custom IDs over loose C-number title matches", async () => {
    const [baseTest] = mockTestData.tests;
    if (!baseTest) {
      throw new Error("Expected mock test data");
    }

    const reportData = {
      ...mockTestData,
      tests: [
        {
          location: baseTest.location,
          results: baseTest.results,
          title: "VerifyCheckoutPageNavigationForLoggedInUser_RT_TS61TC01",
          custom_id:
            "TestScriptRepository.checkout.VerifyCheckoutPageNavigationForLoggedInUser_RT_TS61TC01::default::VerifyCheckoutPageNavigationForLoggedInUser_RT_TS61TC01",
        },
      ],
    };

    await jsonReportService.processReport(
      reportData,
      "b4225bdf-9e2b-43f9-8f13-5bb6f5079176",
    );

    expect(dbClient.spec.findMany).toHaveBeenCalledWith({
      where: {
        projectId: "b4225bdf-9e2b-43f9-8f13-5bb6f5079176",
        key: {
          in: [
            "TestScriptRepository.checkout.VerifyCheckoutPageNavigationForLoggedInUser_RT_TS61TC01::default::VerifyCheckoutPageNavigationForLoggedInUser_RT_TS61TC01",
          ],
        },
      },
    });
  });

  it("should persist provided executionType on execution create", async () => {
    const reportData = {
      ...mockTestData,
      runId: "RELEASE_RUN",
      executionType: "release",
    };

    await jsonReportService.processReport(
      reportData,
      "b4225bdf-9e2b-43f9-8f13-5bb6f5079176",
    );

    expect(dbClient.execution.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "release",
        name: "RELEASE_RUN",
      }),
    });
  });

  it("should default execution type to nightly when executionType is absent", async () => {
    const reportData = {
      ...mockTestData,
      runId: "DEFAULT_RUN",
    };

    await jsonReportService.processReport(
      reportData,
      "b4225bdf-9e2b-43f9-8f13-5bb6f5079176",
    );

    expect(dbClient.execution.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "nightly",
        name: "DEFAULT_RUN",
      }),
    });
  });

  it("should persist 5001 tests with a bounded number of database batches", async () => {
    const tests = Array.from({ length: 5001 }, (_, index) => ({
      title: `Test ${index}`,
      custom_id: `test-${index}`,
      location: { file: `test-${index}.spec.ts`, line: 1 },
      results: [
        {
          retry: 0,
          status: "passed",
          duration: 1,
          startTime: new Date(1_700_000_000_000 + index).toISOString(),
          workerIndex: 0,
        },
      ],
    }));

    let specReadBatch = 0;
    dbClient.spec.findMany.mockImplementation(
      async ({ where }: { where: { key: { in: string[] } } }) => {
        specReadBatch += 1;
        return specReadBatch <= 11
          ? []
          : where.key.in.map((key) => ({ id: `spec-${key}`, key }));
      },
    );

    const result = await jsonReportService.processReport(
      {
        ...mockTestData,
        runId: "large-report",
        tests,
      },
      "b4225bdf-9e2b-43f9-8f13-5bb6f5079176",
    );

    expect(result).toEqual({
      success: true,
      executionId: 1,
      specsProcessed: 5001,
    });
    expect(dbClient.spec.findFirst).not.toHaveBeenCalled();
    expect(dbClient.result.findFirst).not.toHaveBeenCalled();
    expect(dbClient.spec.findMany.mock.calls.length).toBeLessThanOrEqual(22);
    expect(dbClient.spec.createMany.mock.calls.length).toBeLessThanOrEqual(11);
    expect(dbClient.result.findMany.mock.calls.length).toBeLessThanOrEqual(12);
    expect(dbClient.result.createMany.mock.calls.length).toBeLessThanOrEqual(
      12,
    );
  });

  it("should not create a duplicate result when the execution already contains it", async () => {
    dbClient.result.findMany.mockResolvedValue([
      {
        specId: "spec-TEST_SPEC Test Case",
        startTime: new Date("2025-05-14T10:30:00Z"),
      },
    ]);

    const result = await jsonReportService.processReport(
      { ...mockTestData, runId: "existing-run" },
      "b4225bdf-9e2b-43f9-8f13-5bb6f5079176",
    );

    expect(result.specsProcessed).toBe(1);
    expect(dbClient.result.createMany).not.toHaveBeenCalled();
    expect(dbClient.resultError.createMany).not.toHaveBeenCalled();
  });

  it("should batch failed-test errors with their generated result IDs", async () => {
    const [testSpec] = mockTestData.tests;
    if (!testSpec) {
      throw new Error("Expected mock test data");
    }

    await jsonReportService.processReport(
      {
        ...mockTestData,
        runId: "failed-run",
        tests: [
          {
            ...testSpec,
            results: [
              {
                retry: 0,
                status: "failed",
                duration: 1000,
                startTime: "2025-05-14T10:30:00Z",
                workerIndex: 0,
                error: {
                  message: "Error: expected true",
                  stack: "Error: expected true",
                  location: { file: "test.spec.js", line: 10 },
                },
              },
            ],
          },
        ],
      },
      "b4225bdf-9e2b-43f9-8f13-5bb6f5079176",
    );

    const createdResult = dbClient.result.createMany.mock.calls[0][0].data[0];
    const createdError =
      dbClient.resultError.createMany.mock.calls[0][0].data[0];
    expect(createdError).toEqual(
      expect.objectContaining({
        resultId: createdResult.id,
        type: "TestError",
        message: "Mock error",
        location: "test.js:1",
      }),
    );
  });
});
