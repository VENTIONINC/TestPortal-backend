// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

/**
 * CTRF (Common Test Result Format) MCP tool schemas
 */

import { z } from "zod/v3";
import type { MCPToolSchema } from "@/types";

const sourceSnippetSchema = z.object({
  path: z.string(), text: z.string(), startLine: z.number().int().positive(), failingLine: z.number().int().positive(),
});
const testPortalErrorSchema = z.object({
  index: z.number().int().nonnegative(), message: z.string().optional(), stack: z.string().optional(),
  location: z.object({ file: z.string(), line: z.number().int(), column: z.number().int().optional() }).optional(),
  rawLogs: z.array(z.string()).optional(), sourceSnippet: sourceSnippetSchema.optional(), generatedTestCase: z.string().optional(),
});
const testPortalExtraSchema = z.object({ version: z.literal(1), errors: z.array(testPortalErrorSchema) });
const extraSchema = z.object({ testPortal: testPortalExtraSchema }).passthrough();
const testStatusSchema = z.enum(["passed", "failed", "skipped", "pending", "other"]);
const retryAttemptSchema = z.object({
  attempt: z.number().int().positive(), status: testStatusSchema, duration: z.number().int().nonnegative().optional(),
  message: z.string().optional(), trace: z.string().optional(), line: z.number().int().optional(), snippet: z.string().optional(),
  stdout: z.array(z.string()).optional(), stderr: z.array(z.string()).optional(), start: z.number().int().optional(), stop: z.number().int().optional(), extra: extraSchema.optional(),
});

/**
 * Schema for processing CTRF reports
 */
export const processCtrfReportSchema: MCPToolSchema = {
  projectId: z.string().describe("Project ID to associate the CTRF report with"),
  report: z.object({
    reportFormat: z.literal("CTRF"),
    specVersion: z.literal("0.0.0"),
    results: z.object({
      tool: z.object({
        name: z.string().describe("Test tool name (e.g., 'playwright', 'jest')"),
        version: z.string().optional().describe("Tool version"),
      }),
      summary: z.object({
        tests: z.number().describe("Total number of tests"),
        passed: z.number().describe("Number of passed tests"),
        failed: z.number().describe("Number of failed tests"),
        pending: z.number().describe("Number of pending tests"),
        skipped: z.number().describe("Number of skipped tests"),
        other: z.number().describe("Number of tests with other status"),
        start: z.number().describe("Start timestamp (Unix epoch)"),
        stop: z.number().describe("End timestamp (Unix epoch)"),
      }),
      tests: z.array(z.object({
        name: z.string().describe("Test name/title"),
        status: testStatusSchema.describe("Test status"),
        duration: z.number().describe("Test duration in milliseconds"),
        start: z.number().optional().describe("Test start timestamp (Unix epoch)"),
        stop: z.number().optional().describe("Test end timestamp (Unix epoch)"),
        message: z.string().optional().describe("Error/failure message"),
        trace: z.string().optional().describe("Stack trace or detailed error info"),
        rawStatus: z.string().optional().describe("Original status from test framework"),
        type: z.string().optional().describe("Test type (e.g., 'unit', 'integration')"),
        filePath: z.string().optional().describe("Path to test file"),
        retries: z.number().int().nonnegative().optional().describe("Number of retries"),
        retryAttempts: z.array(retryAttemptSchema).optional(),
        flaky: z.boolean().optional().describe("Whether test is flaky"),
        suite: z.array(z.string()).optional().describe("Test suite hierarchy"),
        tags: z.array(z.string()).optional().describe("Array of test tags"),
        snippet: z.string().optional(),
        line: z.number().int().optional(),
        stdout: z.array(z.string()).optional(),
        stderr: z.array(z.string()).optional(),
        extra: extraSchema.optional(),
        meta: z.record(z.string(), z.any()).optional().describe("Custom test metadata"),
      })),
      environment: z.object({
        appName: z.string().optional().describe("Application name"),
        buildName: z.string().optional().describe("Build name"),
        buildNumber: z.string().optional().describe("Build number"),
        buildUrl: z.string().optional().describe("Build URL"),
        repositoryName: z.string().optional().describe("Repository name"),
        repositoryUrl: z.string().optional().describe("Repository URL"),
        branchName: z.string().optional().describe("Git branch name"),
        testEnvironment: z.string().optional().describe("Test environment (e.g., 'staging', 'prod')"),
        executionType: z.string().optional().describe("Execution type (e.g., nightly, release, ondemand)"),
        extra: z.record(z.string(), z.any()).optional().describe("Custom environment metadata"),
      }).optional(),
      extra: z.record(z.string(), z.any()).optional().describe("Custom metadata"),
    }),
  }).describe("CTRF report data"),
};

/**
 * Schema for updating CTRF reports
 */
export const updateCtrfReportSchema: MCPToolSchema = {
  executionId: z.number().describe("Execution ID to update"),
  updates: z.object({
    results: z.object({
      tool: z.object({
        name: z.string().optional().describe("Test tool name"),
        version: z.string().optional().describe("Tool version"),
      }).optional(),
      summary: z.object({
        tests: z.number().optional().describe("Total number of tests"),
        passed: z.number().optional().describe("Number of passed tests"),
        failed: z.number().optional().describe("Number of failed tests"),
        pending: z.number().optional().describe("Number of pending tests"),
        skipped: z.number().optional().describe("Number of skipped tests"),
        other: z.number().optional().describe("Number of tests with other status"),
        start: z.number().optional().describe("Start timestamp (Unix epoch)"),
        stop: z.number().optional().describe("End timestamp (Unix epoch)"),
      }).optional(),
      tests: z.array(z.object({
        name: z.string().optional().describe("Test name/title"),
        status: z.enum(["passed", "failed", "skipped", "pending", "other"]).optional().describe("Test status"),
        duration: z.number().optional().describe("Test duration in milliseconds"),
        start: z.number().optional().describe("Test start timestamp (Unix epoch)"),
        stop: z.number().optional().describe("Test end timestamp (Unix epoch)"),
        message: z.string().optional().describe("Error/failure message"),
        trace: z.string().optional().describe("Stack trace or detailed error info"),
      })).optional().describe("Array of partial test results to update"),
      environment: z.object({
        appName: z.string().optional().describe("Application name"),
        buildName: z.string().optional().describe("Build name"),
        buildNumber: z.string().optional().describe("Build number"),
        testEnvironment: z.string().optional().describe("Test environment"),
      }).optional(),
    }).optional(),
  }).describe("Partial CTRF report data to update"),
};
