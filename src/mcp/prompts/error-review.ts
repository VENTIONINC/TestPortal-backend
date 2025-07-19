/**
 * Automated Error Review Prompt - Run automated review on test errors and create assumptions
 */

import { createMcpPrompt, createPromptResponse, createUserMessage } from "@/mcp/helpers/mcpPromptHelpers";
import { errorReviewPromptSchema } from "@/mcp/schemas/promptSchemas";
import type { MCPPromptResult } from "@/types/mcp";

interface ErrorReviewPromptArgs {
  error_ids: number[];
}

const handler = async (args: ErrorReviewPromptArgs): Promise<MCPPromptResult> => {
  const { error_ids } = args;
  
  let prompt = `Please perform an automated review of test errors and create analytical assumptions using this workflow:

**Error IDs to Review:** ${error_ids.join(', ')}

**Automated Review Process:**

1. **Individual Error Review**
   For each error ID (${error_ids.join(', ')}):
   - Use 'test-portal:review-result-error' to perform automated analysis
   - Extract patterns, categorize error types, and identify potential causes

2. **Bulk Processing** (if applicable)
   Use 'test-portal:bulk-review-result-errors' with the error ID array to:
   - Perform batch analysis for efficiency
   - Identify cross-error patterns and correlations

3. **Create Analytical Assumptions**
   Based on the review findings, use 'test-portal:create-assumption' to:
   - Document error analysis hypothesis
   - Assign confidence levels to assumptions
   - Link assumptions to potential root causes

4. **Validation and Verification**
   Use 'test-portal:get-assumption-by-id' to verify created assumptions and ensure:
   - Assumptions are properly documented
   - Confidence levels are appropriate
   - Hypotheses are actionable

**Expected Outcomes:**
- Categorized error analysis for each provided error
- Generated assumptions with confidence scores
- Actionable insights for error resolution
- Patterns identification across multiple errors

**Review Focus Areas:**
- Error frequency and patterns
- Potential infrastructure issues
- Script or test logic problems
- Environmental factors
- Performance-related issues

This automated review will help systematically analyze errors and build a knowledge base of assumptions for future reference.`;

  return createPromptResponse(
    "Run automated review on test errors and create assumptions",
    [createUserMessage(prompt)]
  );
};

export const errorReviewPrompt = createMcpPrompt(
  "automated_error_review",
  "Run automated review on test errors and create assumptions",
  errorReviewPromptSchema,
  handler,
  "error review"
);