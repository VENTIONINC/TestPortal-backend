// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { ChatOpenAI } from "@langchain/openai";
import type { ZodType } from "zod";

import { AiConfigurationError } from "@/config/aiConfig";
import {
  getAiApiKeyForClient,
  getAiConfigSnapshot,
  type AiConfigSnapshot,
  type AiOperationName,
} from "@/config/aiConfig";
import {
  aiOperationConfigSchema,
  type AiOperationConfig,
} from "@/config/aiConfigSchema";
import { getPromptModelOptions } from "@/config/promptModels";

export type AiFailureCategory =
  | "authentication/configuration"
  | "rate-limit"
  | "unavailable/timeout"
  | "invalid-response"
  | "unknown";

export interface AiFailureDiagnostic {
  category: AiFailureCategory;
  connection: "openai" | "custom";
  configurationSetting?: "OPENAI_API_KEY";
  requestedModel?: string;
  returnedModel?: string;
}

export interface GenerativeAiClientContext {
  connection: "openai" | "custom";
  requestedModel: string;
}

interface CanonicalOperationPolicy {
  maxRetries: number;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface GenerativeAiEffectiveSettings extends AiOperationConfig {
  maxRetries: number;
  sdkMaxRetries: 0;
}

const canonicalOperationPolicy: Readonly<
  Record<AiOperationName, CanonicalOperationPolicy>
> = Object.freeze({
  classification: { maxRetries: 2, maxOutputTokens: 4000 },
  formatting: { maxRetries: 2, temperature: 0.7, maxOutputTokens: 500 },
  suggestions: { maxRetries: 2, temperature: 0.3, maxOutputTokens: 700 },
  insights: { maxRetries: 1, temperature: 0.2, maxOutputTokens: 400 },
});

export class GenerativeAiError extends Error {
  readonly diagnostic: AiFailureDiagnostic;

  constructor(diagnostic: AiFailureDiagnostic) {
    super(`AI request failed (${diagnostic.category}).`);
    this.name = "GenerativeAiError";
    this.diagnostic = Object.freeze({ ...diagnostic });
  }
}

export function invalidAiResponseError(
  client: GenerativeAiClientContext,
  returnedModel?: unknown,
): GenerativeAiError {
  const requestedModel = safeModelIdentifier(client.requestedModel);
  const safeReturnedModel = safeModelIdentifier(returnedModel);
  return new GenerativeAiError({
    category: "invalid-response",
    connection: client.connection,
    ...(requestedModel ? { requestedModel } : {}),
    ...(safeReturnedModel ? { returnedModel: safeReturnedModel } : {}),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function returnedModelFromRaw(raw: Record<string, unknown>): unknown {
  const metadata = isRecord(raw.response_metadata)
    ? raw.response_metadata
    : {};
  return metadata.model ?? metadata.model_name;
}

function containsIncompleteOutputItem(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsIncompleteOutputItem);
  }
  if (!isRecord(value)) {
    return false;
  }

  if (
    (typeof value.status === "string" && value.status !== "completed") ||
    (value.incomplete_details !== undefined && value.incomplete_details !== null) ||
    (value.incompleteDetails !== undefined && value.incompleteDetails !== null)
  ) {
    return true;
  }

  return [value.output, value.output_items, value.outputItems, value.content].some(
    containsIncompleteOutputItem,
  );
}

/** Validate raw completion metadata and the feature-owned parsed schema. */
export function parseStructuredCompletion<T>(
  client: GenerativeAiClientContext,
  result: unknown,
  schema: ZodType<T>,
): T {
  if (!isRecord(result) || !isRecord(result.raw)) {
    throw invalidAiResponseError(client);
  }

  const raw = result.raw;
  const metadata = isRecord(raw.response_metadata) ? raw.response_metadata : {};
  const additional = isRecord(raw.additional_kwargs) ? raw.additional_kwargs : {};
  const finishReason = metadata.finish_reason ?? raw.finish_reason;
  const status = metadata.status;
  const incompleteDetails = metadata.incomplete_details;
  const content = Array.isArray(raw.content) ? raw.content : [];
  const refusalBlock = content.some(
    (block) => isRecord(block) && block.type === "refusal",
  );
  const incomplete =
    (status !== undefined && status !== "completed") ||
    (incompleteDetails !== undefined && incompleteDetails !== null) ||
    containsIncompleteOutputItem(metadata.output) ||
    containsIncompleteOutputItem(metadata.output_items) ||
    containsIncompleteOutputItem(raw.output) ||
    containsIncompleteOutputItem(content);

  if (additional.refusal || refusalBlock || finishReason === "length" || incomplete) {
    throw invalidAiResponseError(client, returnedModelFromRaw(raw));
  }

  const parsed = schema.safeParse(result.parsed);
  if (!parsed.success) {
    throw invalidAiResponseError(client, returnedModelFromRaw(raw));
  }
  return parsed.data;
}

export function safeModelIdentifier(value: unknown): string | undefined {
  if (
    typeof value === "string" &&
    value.length <= 128 &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value) &&
    !/^sk-[A-Za-z0-9_-]{8,}$/i.test(value)
  ) {
    return value;
  }
  return undefined;
}

function readErrorProperty(error: unknown, property: string): unknown {
  if (error && typeof error === "object" && property in error) {
    return (error as Record<string, unknown>)[property];
  }
  return undefined;
}

function categorizeFailure(error: unknown): AiFailureCategory {
  if (error instanceof GenerativeAiError) {
    return error.diagnostic.category;
  }
  if (error instanceof Error && error.name === "AiConfigurationError") {
    return "authentication/configuration";
  }

  const status = readErrorProperty(error, "status");
  if (status === 401 || status === 403) {
    return "authentication/configuration";
  }
  if (status === 429) {
    return "rate-limit";
  }
  if (status === 400 || status === 404 || status === 422) {
    return "invalid-response";
  }
  if (status === 408 || (typeof status === "number" && status >= 500)) {
    return "unavailable/timeout";
  }

  const code = readErrorProperty(error, "code");
  if (
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "UND_ERR_CONNECT_TIMEOUT"
  ) {
    return "unavailable/timeout";
  }
  return "unknown";
}

function diagnosticFor(
  error: unknown,
  connection: AiConfigSnapshot["connection"],
  requestedModel: string,
): AiFailureDiagnostic {
  const returnedModel = safeModelIdentifier(readErrorProperty(error, "model"));
  const safeRequestedModel = safeModelIdentifier(requestedModel);
  return {
    category: categorizeFailure(error),
    connection: connection.connectionLabel,
    ...(safeRequestedModel ? { requestedModel: safeRequestedModel } : {}),
    ...(returnedModel ? { returnedModel } : {}),
  };
}

export function createGenerativeAiClient(
  operation: AiOperationName,
  snapshot: AiConfigSnapshot = getAiConfigSnapshot(),
  settingsOverride: Partial<AiOperationConfig> = {},
) {
  const settings = aiOperationConfigSchema.safeParse({
    ...snapshot.operations[operation],
    ...settingsOverride,
  });
  if (!settings.success) {
    throw new AiConfigurationError(
      `Evaluation AI settings are invalid at ${settings.error.issues
        .map((issue) => issue.path.map(String).join("."))
        .join(", ")}. Check the supported operation settings.`,
    );
  }
  const resolvedSettings = settings.data;
  const apiKey = getAiApiKeyForClient(snapshot);
  if (!apiKey) {
    const requestedModel = safeModelIdentifier(resolvedSettings.model);
    throw new GenerativeAiError({
      category: "authentication/configuration",
      connection: snapshot.connection.connectionLabel,
      configurationSetting: "OPENAI_API_KEY",
      ...(requestedModel ? { requestedModel } : {}),
    });
  }

  const isCanonical = snapshot.connection.connectionLabel === "openai";
  const policy = canonicalOperationPolicy[operation];
  const maxRetries = isCanonical ? policy.maxRetries : 0;
  const hasReasoning = resolvedSettings.reasoningEffort !== undefined;
  const temperature =
    resolvedSettings.temperature ??
    (isCanonical && !hasReasoning ? policy.temperature : undefined);
  const maxTokens =
    resolvedSettings.maxOutputTokens ??
    (isCanonical ? policy.maxOutputTokens : undefined);
  const effectiveSettings: GenerativeAiEffectiveSettings = {
    ...resolvedSettings,
    maxRetries,
    sdkMaxRetries: 0,
    ...(temperature !== undefined ? { temperature } : {}),
    ...(maxTokens !== undefined ? { maxOutputTokens: maxTokens } : {}),
  };

  try {
    const translatedOptions = getPromptModelOptions({
      model: resolvedSettings.model,
      useResponsesApi: resolvedSettings.api === "responses",
      maxRetries,
      ...(temperature !== undefined ? { temperature } : {}),
      ...(maxTokens !== undefined ? { maxTokens } : {}),
      ...(resolvedSettings.reasoningEffort !== undefined
        ? { reasoningEffort: resolvedSettings.reasoningEffort }
        : {}),
    });
    const model = new ChatOpenAI({
      ...translatedOptions,
      apiKey,
      configuration: {
        baseURL: snapshot.connection.baseUrl,
        maxRetries: 0,
      },
    });

    return {
      model,
      async invoke<T>(operationCall: () => Promise<T>): Promise<T> {
        try {
          return await operationCall();
        } catch (error) {
          throw new GenerativeAiError(
            diagnosticFor(error, snapshot.connection, resolvedSettings.model),
          );
        }
      },
      requestedModel: resolvedSettings.model,
      connection: snapshot.connection.connectionLabel,
      effectiveSettings,
    };
  } catch (error) {
    throw new GenerativeAiError(
      diagnosticFor(error, snapshot.connection, resolvedSettings.model),
    );
  }
}
