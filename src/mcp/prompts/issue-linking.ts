/**
 * Issue-Error Linking Prompt - Create connections between issues and test errors with assumptions
 */

import { createMcpPrompt, createPromptResponse, createUserMessage } from "@/mcp/helpers/mcpPromptHelpers";
import { issueLinkingPromptSchema } from "@/mcp/schemas/promptSchemas";
import type { MCPPromptResult } from "@/types/mcp";

interface IssueLinkingPromptArgs {
  issue_id: number;
  error_id: number;
  hypothesis?: string;
}

const handler = async (args: IssueLinkingPromptArgs): Promise<MCPPromptResult> => {
  const { issue_id, error_id, hypothesis } = args;
  
  let prompt = `Please create a connection between an issue and a test error using analytical assumptions:

**Linking Parameters:**
- Issue ID: ${issue_id}
- Error ID: ${error_id}`;

  if (hypothesis) {
    prompt += `\n- Hypothesis: ${hypothesis}`;
  }

  prompt += `

**Linking Workflow:**

1. **Issue Investigation**
   Use 'test-portal:get-issue-by-id' with ID ${issue_id} to:
   - Understand the issue details
   - Review issue category and description
   - Identify issue priority and status

2. **Error Analysis**
   Use 'test-portal:get-result-error-by-id' with ID ${error_id} to:
   - Examine error details and stack trace
   - Understand error context and call logs
   - Analyze error patterns and type

3. **Create Analytical Assumption**
   Use 'test-portal:create-assumption' to establish the connection:`;

  if (hypothesis) {
    prompt += `\n   - Use provided hypothesis: "${hypothesis}"`;
  } else {
    prompt += `\n   - Develop hypothesis based on issue and error analysis`;
  }

  prompt += `
   - Set appropriate confidence level based on evidence
   - Document the reasoning for the connection

4. **Assign Issue to Error**
   Use 'test-portal:assign-issue-to-result-error' to:
   - Formally link the issue to the error
   - Establish traceability between problems and failures

**Analysis Goals:**
- Identify causal relationships between known issues and test failures
- Build a knowledge base of issue-error correlations
- Improve future error diagnosis through historical patterns
- Enable proactive issue detection and resolution

**Connection Assessment:**
- Evaluate the strength of the issue-error relationship
- Consider timing, environment, and error patterns
- Document confidence level and supporting evidence

This linking process helps build a comprehensive understanding of how known issues manifest as test failures, enabling better debugging and issue resolution.`;

  return createPromptResponse(
    "Create connections between issues and test errors with assumptions",
    [createUserMessage(prompt)]
  );
};

export const issueLinkingPrompt = createMcpPrompt(
  "link_issues_to_errors",
  "Create connections between issues and test errors with assumptions",
  issueLinkingPromptSchema,
  handler,
  "issue linking"
);