import { z } from "zod";
import type { MCPToolContext, MCPToolResponse } from "@/types";

export type ZodShape = Record<string, z.ZodTypeAny>;

export const buildSchema = (schema: ZodShape) => z.object(schema);

export const parseResponseJson = (response: MCPToolResponse): unknown => {
  const text = response.content?.[0]?.text ?? "";
  const separatorIndex = text.indexOf("\n\n");
  const jsonText = separatorIndex >= 0 ? text.slice(separatorIndex + 2) : text;
  return JSON.parse(jsonText);
};

export const normalizeJson = <T>(data: T): T =>
  JSON.parse(JSON.stringify(data)) as T;

export const defaultContext: MCPToolContext = { mcpUserId: "user-1" };

export const expectErrorResponse = (
  response: MCPToolResponse,
  operation: string,
  message: string,
): void => {
  const text = response.content?.[0]?.text ?? "";
  expect(response.isError).toBe(true);
  expect(text).toContain(`Error ${operation}: ${message}`);
};
