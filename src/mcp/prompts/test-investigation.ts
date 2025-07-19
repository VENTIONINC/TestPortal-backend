/**
 * Test Results Investigation Prompt - Deep dive into failed test results with statistical analysis
 */

import { createMcpPrompt, createPromptResponse, createUserMessage } from "@/mcp/helpers/mcpPromptHelpers";
import { testInvestigationPromptSchema } from "@/mcp/schemas/promptSchemas";
import type { MCPPromptResult } from "@/types/mcp";

interface TestInvestigationPromptArgs {
  environment?: string;
  spec_file?: string;
  date_range?: string;
}

const handler = async (args: TestInvestigationPromptArgs): Promise<MCPPromptResult> => {
  const { environment, spec_file, date_range } = args;
  
  let prompt = `Please perform a comprehensive investigation of test failures using the following analytical workflow:

1. **Get Test Results Overview**
   Use 'test-portal:get-results' to retrieve test results`;

  if (environment) {
    prompt += ` filtered by environment: "${environment}"`;
  }

  if (spec_file) {
    prompt += ` for specific test file: "${spec_file}"`;
  }

  if (date_range) {
    prompt += ` within date range: "${date_range}"`;
  }

  prompt += `

2. **Statistical Analysis**
   Use 'test-portal:get-results-stats' to get statistical insights about test performance

3. **Detailed Failure Analysis**
   For failed tests, use 'test-portal:get-result-by-id' to examine specific failures

4. **Error Investigation**
   Use 'test-portal:get-result-error-by-id' to dive deep into error details including:
   - Stack traces
   - Error messages
   - Call logs

5. **Analysis and Reporting**
   Provide comprehensive insights including:
   - Failure rate trends
   - Most common failure patterns
   - Environment-specific issues
   - Recommendations for improvement
   - Potential root causes

Investigation Parameters:`;

  if (environment) {
    prompt += `\n- Environment: ${environment}`;
  }

  if (spec_file) {
    prompt += `\n- Test File: ${spec_file}`;
  }

  if (date_range) {
    prompt += `\n- Date Range: ${date_range}`;
  }

  if (!environment && !spec_file && !date_range) {
    prompt += `\n- No filters applied (analyzing all recent test results)`;
  }

  return createPromptResponse(
    "Deep dive into failed test results with statistical analysis",
    [createUserMessage(prompt)]
  );
};

export const testInvestigationPrompt = createMcpPrompt(
  "investigate_test_failures",
  "Deep dive into failed test results with statistical analysis",
  testInvestigationPromptSchema,
  handler,
  "test investigation"
);