import type { z } from "zod";

// MCP Tool Definition Types
export interface MCPToolSchema {
  [key: string]:
    | z.ZodSchema
    | { type: string; default?: unknown; optional?: boolean };
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: MCPToolSchema;
}

export type MCPToolHandler<TInput = unknown> = (
  input: TInput,
) => Promise<unknown>;

// MCP Server Types
export interface MCPServerConfig {
  name: string;
  version: string;
  tools: MCPToolDefinition[];
}

// MCP Tool Input/Output Types
export interface MCPToolRequest<TInput = unknown> {
  name: string;
  arguments: TInput;
}

export interface MCPToolResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

// Error Analysis Types (for MCP error analyzer tool)
export interface ErrorAnalysisInput {
  targetResultError: {
    id: number;
    type: string;
    message: string;
    callLog: string;
    callStack: string;
  };
}

export interface ErrorAnalysisOutput {
  similarErrors: Array<{
    id: number;
    similarity: number;
    assumptions: Array<{
      id: number;
      isConfirmed: boolean;
      issue: {
        id: number;
        name: string;
        category: string;
      };
    }>;
  }>;
  recommendation: string;
}
