import { jsonReportService } from "../jsonReportService";

// Mock the database client and logger
jest.mock("@/prisma/client", () => ({
  dbClient: {
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
  },
}));

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

    const result = await jsonReportService.processReport(reportData, 1);

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

    const result = await jsonReportService.processReport(reportData, 1);

    expect(result.success).toBe(true);
    expect(result.executionId).toBe(1);
    expect(result.specsProcessed).toBe(1);

    // Verify execution was created with a generated identifier
    expect(dbClient.execution.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: expect.stringMatching(/^TEST_1\.0\.0_\d{4}-\d{2}-\d{2}_(NIGHT|MORNING|AFTERNOON|EVENING)$/),
      }),
    });
  });

  it("should use custom identifier strategy", async () => {
    const reportData = {
      ...mockTestData,
      identifierStrategy: "hourly" as const,
      // No runId provided
    };

    const result = await jsonReportService.processReport(reportData, 1);

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
      // No env, version, or runId
    };

    const result = await jsonReportService.processReport(reportData, 1);

    expect(result.success).toBe(true);
    
    // Verify execution was created with "unknown" defaults
    expect(dbClient.execution.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: expect.stringMatching(/^UNKNOWN_UNKNOWN_\d{4}-\d{2}-\d{2}_(NIGHT|MORNING|AFTERNOON|EVENING)$/),
      }),
    });
  });
});