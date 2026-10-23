// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z, type ZodTypeAny } from "zod/v3";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { StandardSchemaWithJSON } from "@modelcontextprotocol/server";
import type { MCPToolSchema } from "@/types";

const JSON_SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema";

const isZodSchema = (value: unknown): value is ZodTypeAny =>
  typeof value === "object" &&
  value !== null &&
  "safeParseAsync" in value &&
  typeof value.safeParseAsync === "function";

const descriptorToSchema = (
  fieldName: string,
  descriptor: { type: string; default?: unknown; optional?: boolean },
): ZodTypeAny => {
  let schema: ZodTypeAny;

  switch (descriptor.type) {
    case "string":
      schema = z.string();
      break;
    case "number":
      schema = z.number();
      break;
    case "integer":
      schema = z.number().int();
      break;
    case "boolean":
      schema = z.boolean();
      break;
    default:
      throw new Error(
        `Unsupported MCP schema descriptor for ${fieldName}: ${descriptor.type}`,
      );
  }

  if (Object.hasOwn(descriptor, "default")) {
    schema = schema.default(descriptor.default);
  }

  return descriptor.optional ? schema.optional() : schema;
};

const normalizeSchema = (schema: MCPToolSchema): ZodTypeAny => {
  if (isZodSchema(schema)) return schema;

  const shape: Record<string, ZodTypeAny> = {};
  for (const [name, field] of Object.entries(schema)) {
    if (isZodSchema(field)) {
      shape[name] = field;
    } else if (
      typeof field === "object" &&
      field !== null &&
      "type" in field &&
      typeof field.type === "string"
    ) {
      shape[name] = descriptorToSchema(name, field);
    } else {
      throw new Error(`Unsupported MCP schema field: ${name}`);
    }
  }

  return z.object(shape);
};

const toJsonSchema = (
  schema: ZodTypeAny,
  preserveAdditionalProperties: boolean,
): Record<string, unknown> => {
  const converted = zodToJsonSchema(schema, {
    target: "jsonSchema7",
    $refStrategy: "none",
    effectStrategy: "input",
    pipeStrategy: "input",
  });

  if (
    typeof converted !== "object" ||
    converted === null ||
    Array.isArray(converted) ||
    (converted as Record<string, unknown>).type !== "object"
  ) {
    throw new Error(
      "MCP input schema did not convert to an object JSON Schema",
    );
  }

  const schemaBody = { ...converted } as Record<string, unknown>;
  delete schemaBody.$schema;
  // The legacy SDK omitted this keyword for empty objects, and emitted it for
  // non-empty tool shapes and explicitly strict Zod objects.
  if (!preserveAdditionalProperties && schemaBody.additionalProperties === false) {
    delete schemaBody.additionalProperties;
  }
  return { $schema: JSON_SCHEMA_DIALECT, ...schemaBody };
};

// SDK v2 needs Standard Schema, while existing tools use Zod v3 or legacy descriptors.
/**
 * Adapts an existing Zod v3 input schema to SDK v2's Standard Schema contract.
 * JSON Schema describes the wire input; Zod remains responsible for runtime
 * defaults, transforms, strictness, and refinements.
 */
export const toStandardSchema = <Schema extends ZodTypeAny>(
  input: MCPToolSchema | Schema,
): StandardSchemaWithJSON<z.input<Schema>, z.output<Schema>> => {
  const schema = normalizeSchema(input as MCPToolSchema);
  let sourceSchema: unknown = input;
  while (
    isZodSchema(sourceSchema) &&
    typeof sourceSchema._def === "object" &&
    sourceSchema._def !== null &&
    "schema" in sourceSchema._def
  ) {
    sourceSchema = sourceSchema._def.schema;
  }
  const preserveAdditionalProperties = isZodSchema(sourceSchema)
    ? sourceSchema._def?.unknownKeys === "strict"
    : Object.keys(input).length > 0;
  const jsonSchema = toJsonSchema(schema, preserveAdditionalProperties);

  return {
    "~standard": {
      version: 1,
      vendor: "testportal-zod-v3",
      validate: async (value) => {
        const result = await schema.safeParseAsync(value);
        return result.success
          ? { value: result.data }
          : {
              issues: result.error.issues.map((issue) => ({
                message: issue.message,
                path: issue.path,
              })),
            };
      },
      jsonSchema: {
        input: () => jsonSchema,
        output: () => jsonSchema,
      },
    },
  } as StandardSchemaWithJSON<z.input<Schema>, z.output<Schema>>;
};
