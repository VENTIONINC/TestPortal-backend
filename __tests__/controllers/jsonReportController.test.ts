// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jsonReportController } from "@/controllers/jsonReportController";

describe("jsonReportController Playwright enrichment normalization", () => {
  it("maps native output and error snippet fields into modal context", async () => {
    const transformed = await jsonReportController._transformRawReport({
      runId: "playwright-run",
      config: {},
      stats: { startTime: "2026-08-19T10:00:00Z" },
      suites: [
        {
          suites: [],
          specs: [
            {
              id: "checkout-spec",
              ok: false,
              file: "checkout.spec.ts",
              line: 10,
              column: 1,
              title: "checkout",
              tags: [],
              tests: [
                {
                  timeout: 30_000,
                  annotations: [],
                  expectedStatus: "passed",
                  projectId: "chromium",
                  projectName: "chromium",
                  status: "unexpected",
                  results: [
                    {
                      retry: 0,
                      status: "failed",
                      duration: 100,
                      startTime: "2026-08-19T10:00:00Z",
                      workerIndex: 0,
                      stdout: [{ text: "browser started" }],
                      stderr: [{ text: "request failed" }],
                      error: {
                        message: "checkout failed",
                        stack: "at checkout.spec.ts:12:3",
                        location: {
                          file: "checkout.spec.ts",
                          line: 12,
                          column: 3,
                        },
                        snippet:
                          "await page.goto('/');\nawait checkout.open();\nawait submit.click();",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(transformed.tests[0]?.results[0]).toEqual(
      expect.objectContaining({
        logs: ["browser started", "request failed"],
        errors: [
          expect.objectContaining({
            message: "checkout failed",
            rawLogs: ["browser started", "request failed"],
          }),
        ],
        sourceSnippet: {
          path: "checkout.spec.ts",
          text: "await page.goto('/');\nawait checkout.open();\nawait submit.click();",
          startLine: 10,
          failingLine: 12,
        },
      }),
    );
  });
});
