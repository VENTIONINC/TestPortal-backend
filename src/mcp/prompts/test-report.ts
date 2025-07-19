/**
 * Comprehensive Test Report Prompt - Generate comprehensive test analysis report with trends and insights
 */

import {
  createMcpPrompt,
  createPromptResponse,
  createUserMessage,
} from "@/mcp/helpers/mcpPromptHelpers";
import { testReportPromptSchema } from "@/mcp/schemas/promptSchemas";

interface TestReportPromptArgs {
  date_range: string;
  include_mock?: boolean;
}

const handler = async (
  args: TestReportPromptArgs,
): Promise<MCPPromptResult> => {
  const { date_range, include_mock } = args;

  let prompt = `Please generate a comprehensive test analysis report with trends and insights for the specified period:

**Report Parameters:**
- Date Range: ${date_range}
- Include Mock Data: ${include_mock ? "Yes" : "No"}

**Comprehensive Analysis Workflow:**

1. **Current Time Context**
   Use 'test-portal:current-time' to establish the report generation timestamp

2. **Statistical Overview**
   Use 'test-portal:get-results-stats' to gather comprehensive statistics:
   - Overall test execution metrics
   - Pass/fail rates and trends
   - Performance indicators
   - Execution frequency patterns

3. **Detailed Results Analysis**
   Use 'test-portal:get-results' to examine test results within the date range:
   - Test execution details
   - Environment-specific patterns
   - Failure distribution analysis
   - Test duration and performance trends

4. **Issue Analysis**
   Use 'test-portal:get-issues' to analyze issues during the period:
   - Issue frequency and categories
   - Critical vs. minor issues
   - Resolution patterns and timelines
   - Issue impact on test results`;

  if (include_mock) {
    prompt += `

5. **Mock Data Comparison**
   Use 'test-portal:get-mock-issues' to include mock data for:
   - Baseline comparison analysis
   - Testing scenarios validation
   - Data consistency verification
   - Mock vs. real data patterns`;
  }

  prompt += `

**Report Sections to Generate:**

📊 **Executive Summary**
- Key metrics and KPIs
- Overall health assessment
- Critical findings and recommendations

📈 **Trend Analysis**
- Test execution trends over time
- Failure rate patterns
- Performance improvements or degradations
- Issue frequency evolution

🔍 **Detailed Findings**
- Most problematic test areas
- Environment-specific issues
- Top failure categories
- Performance bottlenecks

🚨 **Critical Issues**
- High-priority failures
- Recurring problems
- Issues requiring immediate attention
- Risk assessment

💡 **Recommendations**
- Improvement opportunities
- Process optimizations
- Infrastructure recommendations
- Testing strategy adjustments

📋 **Appendix**
- Detailed statistics
- Supporting data tables
- Methodology notes

**Analysis Focus:**
- Identify patterns and trends in test execution
- Highlight areas of concern and improvement
- Provide actionable insights for stakeholders
- Support decision-making with data-driven recommendations

This comprehensive report will provide stakeholders with a complete picture of test portal performance and guide strategic decisions for testing improvements.`;

  return createPromptResponse(
    "Generate comprehensive test analysis report with trends and insights",
    [createUserMessage(prompt)],
  );
};

export const testReportPrompt = createMcpPrompt(
  "generate_test_report",
  "Generate comprehensive test analysis report with trends and insights",
  testReportPromptSchema,
  handler,
  "test report generation",
);
