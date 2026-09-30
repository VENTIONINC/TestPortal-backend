// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

const reasoningEffortSchema = z.enum(["none", "low", "medium", "high"]);

const profileSchema = z
  .object({
    provider: z.literal("openai"),
    model: z.string().min(1),
    reasoning: z.object({ effort: reasoningEffortSchema }).strict().optional(),
  })
  .strict();

const operationSchema = z
  .object({
    profile: z.string().min(1),
    temperature: z.number().min(0).max(2).optional(),
    maxOutputTokens: z.number().int().min(1).max(128_000).optional(),
    maxRetries: z.number().int().min(0).max(10).optional(),
    timeoutMs: z.number().int().min(1).max(600_000).optional(),
  })
  .strict();

const runnerTemperatureOverrideSchema = z.number().finite().min(0).max(2);

export const aiConfigurationSchema = z
  .object({
    $schema: z.string().optional(),
    version: z.literal(1),
    profiles: z.record(z.string().min(1), profileSchema).refine(
      (profiles) => Object.keys(profiles).length > 0,
      "At least one profile is required",
    ),
    operations: z.record(z.string().min(1), operationSchema),
  })
  .strict();

export type AiConfiguration = z.infer<typeof aiConfigurationSchema>;
export type AiOperation =
  | "storedResultsAnalysis"
  | "errorFormatting"
  | "solutionSuggestion"
  | "dashboardInsights";
export type EvaluationOperation =
  | "storedResultsAnalysis"
  | "solutionSuggestion";
export type ConfigurationSource = "legacy-defaults" | "explicit-file" | "baseline";

export interface ResolvedAiSettings {
  operation: string;
  version: 1;
  source: ConfigurationSource;
  profile: string;
  provider: "openai";
  model: string;
  reasoning?: { effort: z.infer<typeof reasoningEffortSchema> };
  temperature?: number;
  maxOutputTokens: number;
  maxRetries: number;
  timeoutMs?: number;
  cache?: false;
}

const operationDefaults: Record<AiOperation, Omit<ResolvedAiSettings, "operation" | "version" | "source" | "profile" | "provider" | "model">> = {
  storedResultsAnalysis: { temperature: 0, maxOutputTokens: 4000, maxRetries: 2 },
  errorFormatting: { temperature: 0.7, maxOutputTokens: 500, maxRetries: 2 },
  solutionSuggestion: { temperature: 0.3, maxOutputTokens: 700, maxRetries: 2 },
  dashboardInsights: { temperature: 0.2, maxOutputTokens: 400, maxRetries: 1 },
};

const evaluationDefaults: Record<EvaluationOperation, Omit<ResolvedAiSettings, "operation" | "version" | "source" | "profile" | "provider" | "model">> = {
  storedResultsAnalysis: { temperature: 0.1, maxOutputTokens: 4000, maxRetries: 2, cache: false },
  solutionSuggestion: { temperature: 0.3, maxOutputTokens: 600, maxRetries: 2, cache: false },
};

const supportedModels = {
  "gpt-4.1-mini": { reasoningEfforts: [], temperatureEfforts: null, maxOutputTokens: 32_768 },
  "gpt-5.1": { reasoningEfforts: ["none", "low", "medium", "high"], temperatureEfforts: ["none"], maxOutputTokens: 128_000 },
} as const;

function isTemperatureSupported(model: string, effort?: string): boolean {
  const modelCapabilities = supportedModels[model as keyof typeof supportedModels];
  if (!modelCapabilities) return false;
  return modelCapabilities.temperatureEfforts === null ||
    modelCapabilities.temperatureEfforts.includes((effort ?? "none") as never);
}

type LoadConfigurationOptions = {
  pathValue?: string;
  kind: "production" | "evaluation";
  env?: NodeJS.ProcessEnv;
};

export interface LoadedAiConfiguration {
  config: AiConfiguration;
  source: ConfigurationSource;
  kind: "production" | "evaluation";
}

const cloneLegacyConfig = (kind: LoadConfigurationOptions["kind"]): AiConfiguration => {
  const profiles: AiConfiguration["profiles"] = {
    legacy: { provider: "openai", model: "gpt-4.1-mini" },
  };
  const operations: AiConfiguration["operations"] = {};
  const defaults = kind === "production" ? operationDefaults : evaluationDefaults;

  for (const [operation, settings] of Object.entries(defaults)) {
    operations[operation] = {
      profile: "legacy",
      temperature: settings.temperature,
      maxOutputTokens: settings.maxOutputTokens,
      maxRetries: settings.maxRetries,
    };
  }

  return { version: 1, profiles, operations };
};

const formatValidationError = (error: z.ZodError): string =>
  error.issues
    .map((issue) => `${issue.path.length ? issue.path.join(".") : "configuration"}: ${issue.message}`)
    .join("; ");

const validateReferencesAndCapabilities = (config: AiConfiguration): void => {
  for (const [profileName, profile] of Object.entries(config.profiles)) {
    const modelCapabilities = supportedModels[profile.model as keyof typeof supportedModels];
    if (!modelCapabilities) {
      throw new Error(`Invalid AI configuration: profiles.${profileName}.model is unsupported`);
    }

    const effort = profile.reasoning?.effort;
    if (effort && !modelCapabilities.reasoningEfforts.includes(effort as never)) {
      throw new Error(`Invalid AI configuration: profiles.${profileName}.reasoning.effort is unsupported for ${profile.model}`);
    }
  }

  const expectedOperations = Object.keys(config.operations);

  for (const operation of expectedOperations) {
    const mapping = config.operations[operation];
    const profile = mapping ? config.profiles[mapping.profile] : undefined;
    if (!mapping || !profile) {
      throw new Error(`Invalid AI configuration: operations.${operation}.profile references an unknown profile`);
    }

    const modelCapabilities = supportedModels[profile.model as keyof typeof supportedModels];
    if (!modelCapabilities) {
      throw new Error(`Invalid AI configuration: profiles.${mapping.profile}.model is unsupported`);
    }
    const effort = profile.reasoning?.effort;

    if (mapping.temperature !== undefined && !isTemperatureSupported(profile.model, effort)) {
      throw new Error(`Invalid AI configuration: operations.${operation}.temperature is unsupported for ${profile.model}`);
    }

    if (mapping.maxOutputTokens && mapping.maxOutputTokens > modelCapabilities.maxOutputTokens) {
      throw new Error(`Invalid AI configuration: operations.${operation}.maxOutputTokens exceeds the ${profile.model} limit`);
    }
  }
};

export function loadAiConfiguration({ pathValue, kind, env = process.env }: LoadConfigurationOptions): LoadedAiConfiguration {
  const selectedPath = pathValue?.trim();
  if (!selectedPath) {
    return { config: cloneLegacyConfig(kind), source: kind === "production" ? "legacy-defaults" : "baseline", kind };
  }

  const absolutePath = path.resolve(process.cwd(), selectedPath);
  let contents: string;
  try {
    contents = readFileSync(absolutePath, "utf8");
  } catch {
    throw new Error(`Unable to read AI configuration at ${absolutePath}`);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(contents);
  } catch {
    throw new Error(`Invalid JSON in AI configuration at ${absolutePath}`);
  }

  const parsed = aiConfigurationSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid AI configuration: ${formatValidationError(parsed.error)}`);
  }

  validateReferencesAndCapabilities(parsed.data);
  const allowedOperations = kind === "production"
    ? ["storedResultsAnalysis", "errorFormatting", "solutionSuggestion", "dashboardInsights"]
    : ["storedResultsAnalysis", "solutionSuggestion"];
  for (const operation of Object.keys(parsed.data.operations)) {
    if (!allowedOperations.includes(operation)) {
      throw new Error(`Invalid AI configuration: operations.${operation} is not supported`);
    }
  }
  const required = kind === "production"
    ? ["storedResultsAnalysis", "errorFormatting", "solutionSuggestion", "dashboardInsights"]
    : ["storedResultsAnalysis", "solutionSuggestion"];
  for (const operation of required) {
    if (!parsed.data.operations[operation]) {
      throw new Error(`Invalid AI configuration: operations.${operation} is required`);
    }
  }

  if (kind === "production" && !env.OPENAI_API_KEY?.trim()) {
    throw new Error("AI_CONFIG_PATH requires the OPENAI_API_KEY environment variable");
  }

  return { config: parsed.data, source: "explicit-file", kind };
}

export function resolveAiSettings(
  loaded: LoadedAiConfiguration,
  operation: AiOperation | EvaluationOperation,
  overrides: { model?: string; temperature?: number } = {},
): ResolvedAiSettings {
  if (overrides.temperature !== undefined && !runnerTemperatureOverrideSchema.safeParse(overrides.temperature).success) {
    throw new Error("Invalid runner override temperature: expected a finite number between 0 and 2");
  }

  const mapping = loaded.config.operations[operation];
  if (!mapping) {
    throw new Error(`AI configuration has no settings for operations.${operation}`);
  }
  const profile = loaded.config.profiles[mapping.profile];
  if (!profile) {
    throw new Error(`AI configuration profile ${mapping.profile} is missing`);
  }

  const defaults = loaded.kind === "production"
    ? operationDefaults[operation as AiOperation]
    : evaluationDefaults[operation as EvaluationOperation];
  const model = overrides.model ?? profile.model;
  const modelCapabilities = supportedModels[model as keyof typeof supportedModels];
  if (!modelCapabilities) throw new Error(`Unsupported OpenAI model: ${model}`);
  const reasoning = profile.reasoning;
  const temperature = overrides.temperature ?? mapping.temperature ??
    (isTemperatureSupported(model, reasoning?.effort) ? defaults.temperature : undefined);
  if (reasoning && !modelCapabilities.reasoningEfforts.includes(reasoning.effort as never)) {
    throw new Error(`Unsupported reasoning effort for OpenAI model ${model}`);
  }
  if (temperature !== undefined && !isTemperatureSupported(model, reasoning?.effort)) {
    throw new Error(`Temperature is not supported for OpenAI model ${model} with the selected reasoning settings`);
  }
  const maxOutputTokens = mapping.maxOutputTokens ?? defaults.maxOutputTokens;
  if (maxOutputTokens > modelCapabilities.maxOutputTokens) {
    throw new Error(`maxOutputTokens exceeds the ${model} output limit`);
  }

  return {
    operation,
    version: 1,
    source: loaded.source,
    profile: mapping.profile,
    provider: profile.provider,
    model,
    ...(reasoning ? { reasoning } : {}),
    ...(temperature === undefined ? {} : { temperature }),
    maxOutputTokens,
    maxRetries: mapping.maxRetries ?? defaults.maxRetries,
    ...(mapping.timeoutMs === undefined ? {} : { timeoutMs: mapping.timeoutMs }),
    ...(defaults.cache === false ? { cache: false as const } : {}),
  };
}

export function toChatOpenAIOptions(settings: ResolvedAiSettings) {
  return {
    model: settings.model,
    ...(settings.temperature === undefined ? {} : { temperature: settings.temperature }),
    maxTokens: settings.maxOutputTokens,
    maxRetries: settings.maxRetries,
    ...(settings.timeoutMs === undefined ? {} : { timeout: settings.timeoutMs }),
    ...(settings.reasoning ? { reasoning: settings.reasoning } : {}),
    ...(settings.cache === false ? { cache: false } : {}),
  };
}

let productionConfiguration: LoadedAiConfiguration | undefined;

export function initializeProductionAiConfiguration(env = process.env): void {
  productionConfiguration = loadAiConfiguration({
    ...(env.AI_CONFIG_PATH === undefined ? {} : { pathValue: env.AI_CONFIG_PATH }),
    kind: "production",
    env,
  });
}

export function getProductionAiSettings(operation: AiOperation): ResolvedAiSettings {
  if (!productionConfiguration) {
    initializeProductionAiConfiguration();
  }
  if (!productionConfiguration) {
    throw new Error("Production AI configuration has not been initialized");
  }
  return resolveAiSettings(productionConfiguration, operation);
}

export function loadEvaluationAiConfiguration(env = process.env): LoadedAiConfiguration {
  const selectedPath = env.AI_EVAL_CONFIG_PATH?.trim();
  const loaded = loadAiConfiguration({
    pathValue: selectedPath || path.resolve(process.cwd(), "config/ai/evaluation.baseline.json"),
    kind: "evaluation",
    env,
  });
  return selectedPath ? loaded : { ...loaded, source: "baseline" };
}

export function assertEvaluationCredentials(env = process.env): void {
  if (!env.OPENAI_API_KEY?.trim()) {
    throw new Error("Prompt evaluations require the OPENAI_API_KEY environment variable");
  }
}
