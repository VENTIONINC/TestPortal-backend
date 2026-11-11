// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { ChatOpenAI } from "@langchain/openai";

import {
  getAiApiKeyForClient,
  getAiConfigSnapshot,
  type AiConfigSnapshot,
  type AiOperationName,
} from "@/config/aiConfig";
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

function safeModelIdentifier(value: unknown): string | undefined {
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
) {
  const settings = snapshot.operations[operation];
  const apiKey = getAiApiKeyForClient(snapshot);
  if (!apiKey) {
    const requestedModel = safeModelIdentifier(settings.model);
    throw new GenerativeAiError({
      category: "authentication/configuration",
      connection: snapshot.connection.connectionLabel,
      configurationSetting: "OPENAI_API_KEY",
      ...(requestedModel ? { requestedModel } : {}),
    });
  }

  const isCanonical = snapshot.connection.connectionLabel === "openai";
  const maxRetries = isCanonical ? 2 : 0;
  const isFormatter = operation === "formatting";
  const hasReasoning = settings.reasoningEffort !== undefined;
  const temperature =
    settings.temperature ??
    (isCanonical && isFormatter && !hasReasoning ? 0.7 : undefined);
  const maxTokens =
    settings.maxOutputTokens ?? (isCanonical && isFormatter ? 500 : undefined);

  try {
    const translatedOptions = getPromptModelOptions({
      model: settings.model,
      useResponsesApi: settings.api === "responses",
      maxRetries,
      ...(temperature !== undefined ? { temperature } : {}),
      ...(maxTokens !== undefined ? { maxTokens } : {}),
      ...(settings.reasoningEffort !== undefined
        ? { reasoningEffort: settings.reasoningEffort }
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
            diagnosticFor(error, snapshot.connection, settings.model),
          );
        }
      },
      requestedModel: settings.model,
      connection: snapshot.connection.connectionLabel,
    };
  } catch (error) {
    throw new GenerativeAiError(
      diagnosticFor(error, snapshot.connection, settings.model),
    );
  }
}
