/**
 * Helper functions for MCP prompts to standardize responses and error handling
 */

import type { 
  MCPPromptResult, 
  MCPPromptHandler, 
  MCPPromptSchema,
  MCPPromptMessage 
} from "@/types/mcp";

/**
 * Creates a successful MCP prompt response with structured messages
 */
export const createPromptResponse = (
  description: string,
  messages: MCPPromptMessage[],
): MCPPromptResult => {
  return {
    description,
    messages,
  };
};

/**
 * Creates a user message for MCP prompts
 */
export const createUserMessage = (text: string): MCPPromptMessage => {
  return {
    role: "user",
    content: {
      type: "text",
      text,
    },
  };
};

/**
 * Creates an assistant message for MCP prompts
 */
export const createAssistantMessage = (text: string): MCPPromptMessage => {
  return {
    role: "assistant",
    content: {
      type: "text",
      text,
    },
  };
};

/**
 * Creates a tool workflow prompt that describes available tools and their usage
 */
export const createToolWorkflowPrompt = (
  workflow: string,
  tools: string[],
  context?: string,
): MCPPromptMessage => {
  const toolsList = tools.map(tool => `- ${tool}`).join('\n');
  
  let promptText = `${workflow}\n\nAvailable tools:\n${toolsList}`;
  
  if (context) {
    promptText += `\n\nContext:\n${context}`;
  }

  return createUserMessage(promptText);
};

/**
 * Wraps an async MCP prompt handler with standard error handling
 */
export const withPromptErrorHandling = <TInput = unknown>(
  handler: (params: TInput) => Promise<MCPPromptResult>,
  operation: string,
): MCPPromptHandler<TInput> => {
  return async (params: TInput): Promise<MCPPromptResult> => {
    try {
      return await handler(params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return createPromptResponse(
        `Error in ${operation}`,
        [createAssistantMessage(`Error executing ${operation}: ${errorMessage}`)]
      );
    }
  };
};

/**
 * Creates a standard MCP prompt definition with error handling
 */
export const createMcpPrompt = <TInput = unknown>(
  name: string,
  description: string,
  schema: MCPPromptSchema | undefined,
  handler: (params: TInput) => Promise<MCPPromptResult>,
  operation: string,
): [string, string, MCPPromptSchema | undefined, MCPPromptHandler<TInput>] => {
  return [name, description, schema, withPromptErrorHandling(handler, operation)];
};