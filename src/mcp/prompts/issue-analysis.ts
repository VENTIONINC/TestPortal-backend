/**
 * Issue Analysis Prompt - Analyze recent issues by category with pagination support
 */

import { createMcpPrompt, createPromptResponse, createUserMessage } from "@/mcp/helpers/mcpPromptHelpers";
import { issueAnalysisPromptSchema } from "@/mcp/schemas/promptSchemas";
import type { MCPPromptResult } from "@/types/mcp";

interface IssueAnalysisPromptArgs {
  category?: string;
  days?: number;
}

const handler = async (args: IssueAnalysisPromptArgs): Promise<MCPPromptResult> => {
  const { category, days } = args;
  
  let prompt = `Please analyze recent issues in the test portal using the following workflow:

1. First, use 'test-portal:get-issues' to retrieve issues`;

  if (category) {
    prompt += ` filtered by category: "${category}"`;
  }

  if (days) {
    prompt += ` from the last ${days} days`;
  }

  prompt += `

2. For interesting issues found, use 'test-portal:get-issue-by-id' to get detailed information

3. Analyze the patterns and provide insights about:
   - Most common issue categories
   - Recent trends in issue frequency
   - Critical issues that need attention
   - Potential correlations between issues

Parameters used:`;

  if (category) {
    prompt += `\n- Category filter: ${category}`;
  }

  if (days) {
    prompt += `\n- Time range: Last ${days} days`;
  }

  if (!category && !days) {
    prompt += `\n- No filters applied (analyzing all recent issues)`;
  }

  return createPromptResponse(
    "Analyze recent issues by category with pagination support",
    [createUserMessage(prompt)]
  );
};

export const issueAnalysisPrompt = createMcpPrompt(
  "analyze_recent_issues",
  "Analyze recent issues by category with pagination support",
  issueAnalysisPromptSchema,
  handler,
  "issue analysis"
);