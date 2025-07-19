/**
 * Health Check Prompt - Check test portal server status and current time
 */

import { createMcpPrompt, createPromptResponse, createUserMessage } from "@/mcp/helpers/mcpPromptHelpers";
import { healthCheckPromptSchema } from "@/mcp/schemas/promptSchemas";
import type { MCPPromptResult } from "@/types/mcp";

interface HealthCheckPromptArgs {}

const handler = async (_args: HealthCheckPromptArgs): Promise<MCPPromptResult> => {
  const prompt = `Please check the test portal server health and current time using the following tools:

1. First, use 'test-portal:check-status' to verify the server is running
2. Then, use 'test-portal:current-time' to get the current server time

This will help verify that the test portal server is operational and responding correctly.`;

  return createPromptResponse(
    "Check test portal server status and current time",
    [createUserMessage(prompt)]
  );
};

export const healthCheckPrompt = createMcpPrompt(
  "test_portal_health_check",
  "Check test portal server status and current time",
  healthCheckPromptSchema,
  handler,
  "health check"
);