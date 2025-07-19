/**
 * Zod schemas for MCP prompt parameters validation
 */

import { z } from "zod";

// Health Check Prompt - no parameters
export const healthCheckPromptSchema = {};

// Issue Analysis Prompt
export const issueAnalysisPromptSchema = {
  category: z.string().optional(),
  days: z.number().min(1).max(365).optional(),
};

// Test Results Investigation Prompt
export const testInvestigationPromptSchema = {
  environment: z.string().optional(),
  spec_file: z.string().optional(),
  date_range: z.string().optional(),
};

// Automated Error Review Prompt
export const errorReviewPromptSchema = {
  error_ids: z.array(z.number()),
};

// Issue-Error Linking Prompt
export const issueLinkingPromptSchema = {
  issue_id: z.number(),
  error_id: z.number(),
  hypothesis: z.string().optional(),
};

// Comprehensive Test Report Prompt
export const testReportPromptSchema = {
  date_range: z.string(),
  include_mock: z.boolean().optional(),
};