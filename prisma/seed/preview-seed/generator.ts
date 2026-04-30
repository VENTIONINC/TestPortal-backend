import path from "node:path";
import type {
  PrismaAssumption,
  PrismaExecution,
  PrismaIssue,
  PrismaProject,
  PrismaResult,
  PrismaResultError,
  PrismaSpec,
} from "../../../src/types/database";
import { loadFixtureTemplates } from "./fixtureLoader";
import type {
  DailyMetricRow,
  FixtureCaseTemplate,
  PreviewSeedArtifact,
} from "./types";
import {
  clamp,
  createSeedRng,
  deterministicUuid,
  FIXED_PROFILE,
  stableKey,
  toDateOnlyIso,
} from "./utils";

type FailureCategory = "bug" | "environment" | "script" | "performance" | "other";

interface GeneratedResultRecord {
  row: PrismaResult;
  category: FailureCategory | null;
}

const FIXTURES_DIR = path.join(process.cwd(), "prisma", "seed", "example-reports");
const BASE_TIME = new Date("2026-04-01T12:00:00.000Z");

export function generatePreviewSeedArtifact(): PreviewSeedArtifact {
  const loaded = loadFixtureTemplates(FIXTURES_DIR);
  if (loaded.cases.length === 0) {
    throw new Error("No fixture cases were loaded for preview seed generation");
  }

  const rng = createSeedRng(FIXED_PROFILE.seedKey);
  const syntheticOwnerId = deterministicUuid("preview-owner", FIXED_PROFILE.seedKey);
  const projectId = deterministicUuid("preview-project", FIXED_PROFILE.seedKey);
  const project: PrismaProject = {
    id: projectId,
    createdAt: BASE_TIME,
    updatedAt: BASE_TIME,
    name: FIXED_PROFILE.projectName,
    description: FIXED_PROFILE.projectDescription,
    isActive: true,
    ownerId: syntheticOwnerId,
  };

  const specs = buildSpecs(projectId, loaded.cases);
  const specsById = new Map(specs.map((spec) => [spec.id, spec]));
  const templateBySpecId = new Map(
    loaded.cases.map((template, index) => [specs[index]?.id ?? "", template]),
  );

  const executions: PrismaExecution[] = [];
  const results: PrismaResult[] = [];
  const resultErrors: PrismaResultError[] = [];
  const resultMetadata: GeneratedResultRecord[] = [];

  for (let executionIndex = 0; executionIndex < FIXED_PROFILE.executionCount; executionIndex += 1) {
    const execution = buildExecution(projectId, executionIndex, rng);
    executions.push(execution);

    const selectedSpecIds = selectSpecsForExecution(specs, executionIndex, rng);
    for (const specId of selectedSpecIds) {
      const spec = specsById.get(specId);
      const template = templateBySpecId.get(specId);
      if (!spec || !template) {
        continue;
      }

      const generated = buildResultForExecution({
        execution,
        spec,
        template,
        executionIndex,
        rng,
      });

      results.push(generated.row);
      resultMetadata.push(generated);

      if (generated.category && generated.row.id) {
        const errorRow = buildResultError(generated.row.id, spec, template, executionIndex);
        resultErrors.push(errorRow);
      }
    }
  }

  const issues = buildIssues(projectId, syntheticOwnerId, results, resultErrors, specsById);
  const assumptions = buildAssumptions(issues, resultErrors);
  const dailyMetrics = buildDailyMetrics(projectId, executions, results, resultErrors);

  return {
    meta: {
      generatorVersion: "1.0.0",
      profile: FIXED_PROFILE.name,
      sourceFixtures: loaded.fixtureNames,
      generatedAt: BASE_TIME.toISOString(),
      seedKey: FIXED_PROFILE.seedKey,
      syntheticOwnerId,
      rowCounts: {
        executions: executions.length,
        specs: specs.length,
        results: results.length,
        resultErrors: resultErrors.length,
        issues: issues.length,
        assumptions: assumptions.length,
        dailyMetrics: dailyMetrics.length,
      },
    },
    project,
    executions,
    specs,
    results,
    resultErrors,
    issues,
    assumptions,
    dailyMetrics,
  };
}

function buildSpecs(projectId: string, templates: FixtureCaseTemplate[]): PrismaSpec[] {
  return templates.map((template, index) => ({
    id: deterministicUuid("preview-spec", template.file, template.title, String(index)),
    createdAt: BASE_TIME,
    updatedAt: BASE_TIME,
    key: template.key,
    file: template.file,
    title: template.title,
    tags: JSON.stringify(template.tags),
    annotations: JSON.stringify(template.annotations),
    projectId,
  }));
}

function buildExecution(
  projectId: string,
  executionIndex: number,
  rng: ReturnType<typeof createSeedRng>,
): PrismaExecution {
  const startedAt = new Date(BASE_TIME);
  startedAt.setUTCDate(BASE_TIME.getUTCDate() - (executionIndex % FIXED_PROFILE.daySpread));
  startedAt.setUTCHours(2 + (executionIndex % 5) * 4, rng.nextInt(0, 59), 0, 0);

  const environments = ["qa", "staging", "production", "mobile"] as const;
  const environment = environments[executionIndex % environments.length];
  const provider = executionIndex % 6 === 0 ? "Playwright Mobile" : "Playwright";
  const runName = `${environment}-nightly-${String(executionIndex + 1).padStart(4, "0")}`;

  return {
    id: deterministicUuid("preview-execution", String(executionIndex)),
    createdAt: startedAt,
    updatedAt: startedAt,
    type: executionIndex % 8 === 0 ? "release" : "nightly",
    name: runName,
    environment,
    version: `1.${(executionIndex % 7) + 42}.0`,
    startedAt,
    projectId,
    provider,
  } as PrismaExecution;
}

function selectSpecsForExecution(
  specs: PrismaSpec[],
  executionIndex: number,
  rng: ReturnType<typeof createSeedRng>,
): string[] {
  const count = rng.nextInt(
    FIXED_PROFILE.minSpecsPerExecution,
    FIXED_PROFILE.maxSpecsPerExecution,
  );
  const sorted = [...specs].sort((left, right) =>
    stableKey(left.id, String(executionIndex)).localeCompare(
      stableKey(right.id, String(executionIndex)),
    ),
  );

  return sorted.slice(0, Math.min(count, specs.length)).map((spec) => spec.id);
}

function buildResultForExecution(params: {
  execution: PrismaExecution;
  spec: PrismaSpec;
  template: FixtureCaseTemplate;
  executionIndex: number;
  rng: ReturnType<typeof createSeedRng>;
}): GeneratedResultRecord {
  const { execution, spec, template, executionIndex, rng } = params;
  const baseTemplate = getTemplateResult(template, executionIndex);

  const status = deriveStatus(baseTemplate.status, executionIndex, spec.id, rng);
  const category = status === "failed" ? categorizeFailure(template, baseTemplate.errorMessage) : null;
  const retry = status === "failed" && rng.chance(0.22) ? 1 : 0;
  const duration = deriveDuration(baseTemplate.duration, status, rng);
  const startTime = new Date(execution.startedAt);
  startTime.setUTCMinutes(
    (startTime.getUTCMinutes() + (parseInt(spec.id.slice(0, 2), 16) % 50)) % 60,
  );

  return {
    row: {
      id: deterministicUuid("preview-result", execution.id, spec.id),
      createdAt: execution.startedAt,
      updatedAt: execution.startedAt,
      reportPortalLink:
        baseTemplate.reportPortalLink ??
        `https://preview.local/${execution.name}/spec/${encodeURIComponent(spec.key)}`,
      retry,
      status,
      duration,
      startTime,
      specId: spec.id,
      executionId: execution.id,
      analysisStatus:
        status === "passed" ? "passed" : status === "failed" ? "failed" : null,
      analysisCategory: mapFailureCategory(category),
      analysisConfidence: status === "failed" ? clamp(3 + rng.nextInt(-1, 2), 1, 5) : null,
      analysisConclusion:
        status === "failed"
          ? `Deterministic preview classification: ${category ?? "other"}`
          : null,
      analysisErrorQuality: status === "failed" ? clamp(3 + rng.nextInt(-1, 1), 1, 5) : null,
      analysisErrorQualityConclusion:
        status === "failed"
          ? "Generated from fixture-derived failure family"
          : null,
      analysisReviewedAt: status === "failed" ? execution.startedAt : null,
      analysisReviewedById: status === "failed" ? deterministicUuid("preview-reviewer") : null,
      analysisFeedbackCategory: null,
      analysisFeedbackConfidence: null,
      analysisFeedbackConclusion: null,
    },
    category,
  };
}

function deriveStatus(
  templateStatus: "passed" | "failed" | "skipped",
  executionIndex: number,
  specId: string,
  rng: ReturnType<typeof createSeedRng>,
): "passed" | "failed" | "skipped" {
  const signal = stableKey(templateStatus, specId, String(executionIndex)).slice(0, 2);
  const intensity = parseInt(signal, 16) / 255;

  if (templateStatus === "failed") {
    if (intensity < 0.52) {
      return "failed";
    }
    if (intensity < 0.62 && rng.chance(0.35)) {
      return "skipped";
    }
    return "passed";
  }

  if (templateStatus === "skipped") {
    if (intensity < 0.58) {
      return "skipped";
    }
    return rng.chance(0.18) ? "failed" : "passed";
  }

  if (intensity < 0.06) {
    return "skipped";
  }
  if (intensity < 0.17) {
    return "failed";
  }

  return "passed";
}

function deriveDuration(
  baseDuration: number,
  status: "passed" | "failed" | "skipped",
  rng: ReturnType<typeof createSeedRng>,
): number {
  if (status === "skipped") {
    return 0;
  }

  const multiplier = status === "failed" ? 1.25 : 1;
  const jitter = 1 + (rng.next() - 0.5) * 0.6;
  const candidate = Math.round(Math.max(120, baseDuration || 700) * multiplier * jitter);
  return clamp(candidate, 120, 120_000);
}

function categorizeFailure(
  template: FixtureCaseTemplate,
  errorMessage: string | null,
): FailureCategory {
  const combined = `${template.title} ${template.file} ${template.suite} ${errorMessage ?? ""}`.toLowerCase();

  if (
    combined.includes("timeout") ||
    combined.includes("slow") ||
    combined.includes("latency")
  ) {
    return "performance";
  }
  if (
    combined.includes("network") ||
    combined.includes("service unavailable") ||
    combined.includes("dns") ||
    combined.includes("connection")
  ) {
    return "environment";
  }
  if (
    combined.includes("selector") ||
    combined.includes("element not found") ||
    combined.includes("locator")
  ) {
    return "script";
  }
  if (
    combined.includes("assert") ||
    combined.includes("expect") ||
    combined.includes("validation") ||
    combined.includes("auth")
  ) {
    return "bug";
  }

  return "other";
}

function mapFailureCategory(
  category: FailureCategory | null,
): string | null {
  switch (category) {
    case "environment":
      return "infra";
    case "bug":
    case "script":
    case "performance":
    case "other":
      return category;
    default:
      return null;
  }
}

function buildResultError(
  resultId: string,
  spec: PrismaSpec,
  template: FixtureCaseTemplate,
  executionIndex: number,
): PrismaResultError {
  const templateResult = getTemplateResult(template, executionIndex);
  const message =
    templateResult.errorMessage ??
    `Synthetic failure while executing ${template.title}`;
  const locationFile = templateResult.errorLocationFile || spec.file;
  const locationLine = templateResult.errorLocationLine || 1;

  return {
    id: deterministicUuid("preview-error", resultId),
    createdAt: BASE_TIME,
    updatedAt: BASE_TIME,
    type: classifyErrorType(message),
    message,
    callLog: JSON.stringify([
      `suite=${template.suite}`,
      `spec=${template.title}`,
      `executionIndex=${executionIndex}`,
    ]),
    callStack: templateResult.errorSnippet ?? `at ${locationFile}:${locationLine}`,
    testAssertion:
      message.toLowerCase().includes("expect") || message.toLowerCase().includes("assert")
        ? message
        : null,
    expectedPattern: message.toLowerCase().includes("expect") ? "expected condition" : null,
    receivedString: message.toLowerCase().includes("not found") ? "selector-miss" : null,
    location: `${locationFile}:${locationLine}`,
    resultId,
  };
}

function getTemplateResult(
  template: FixtureCaseTemplate,
  executionIndex: number,
) {
  const selected =
    template.resultTemplates[executionIndex % template.resultTemplates.length] ??
    template.resultTemplates[0];

  if (!selected) {
    throw new Error(`Fixture case '${template.title}' does not contain any result templates`);
  }

  return selected;
}

function classifyErrorType(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("timeout")) {
    return "TimeoutError";
  }
  if (lower.includes("assert") || lower.includes("expect")) {
    return "AssertionError";
  }
  if (lower.includes("not found") || lower.includes("selector")) {
    return "SelectorError";
  }
  if (lower.includes("network") || lower.includes("connection")) {
    return "NetworkError";
  }
  return "Error";
}

function buildIssues(
  projectId: string,
  ownerId: string,
  results: PrismaResult[],
  errors: PrismaResultError[],
  specsById: Map<string, PrismaSpec>,
): PrismaIssue[] {
  const failuresByFingerprint = new Map<
    string,
    { count: number; error: PrismaResultError; spec: PrismaSpec | undefined }
  >();
  const errorByResultId = new Map(errors.map((error) => [error.resultId ?? "", error]));

  for (const result of results) {
    if (result.status !== "failed") {
      continue;
    }
    const error = errorByResultId.get(result.id);
    if (!error) {
      continue;
    }
    const fingerprint = stableKey(error.type, error.message, result.specId);
    const current = failuresByFingerprint.get(fingerprint);
    if (current) {
      current.count += 1;
      continue;
    }

    failuresByFingerprint.set(fingerprint, {
      count: 1,
      error,
      spec: specsById.get(result.specId),
    });
  }

  return Array.from(failuresByFingerprint.entries())
    .filter(([, value]) => value.count >= 2)
    .sort((left, right) => right[1].count - left[1].count)
    .slice(0, FIXED_PROFILE.issueLimit)
    .map(([fingerprint, value], index) => {
      const category = issueCategoryFromError(value.error);
      return {
        id: deterministicUuid("preview-issue", fingerprint),
        createdAt: BASE_TIME,
        updatedAt: BASE_TIME,
        name: `${value.spec?.title ?? "Generated spec"} regression #${index + 1}`,
        category,
        description: `${value.error.message} (reproduced ${value.count} times in preview dataset)`,
        portal: "preview-seed",
        service: inferServiceName(value.spec?.file ?? ""),
        ticket: `PREVIEW-${String(index + 1).padStart(3, "0")}`,
        projectId,
        createdById: ownerId,
        updatedById: ownerId,
      };
    });
}

function issueCategoryFromError(error: PrismaResultError): string {
  const lower = `${error.type} ${error.message}`.toLowerCase();
  if (lower.includes("network") || lower.includes("timeout")) {
    return "environment";
  }
  if (lower.includes("selector")) {
    return "script";
  }
  if (lower.includes("slow")) {
    return "performance";
  }
  if (lower.includes("assert") || lower.includes("expect")) {
    return "bug";
  }
  return "other";
}

function inferServiceName(filePath: string): string {
  const segments = filePath.split(/[\\/]/).filter(Boolean);
  return segments.at(-2) ?? "web";
}

function buildAssumptions(
  issues: PrismaIssue[],
  errors: PrismaResultError[],
): PrismaAssumption[] {
  return issues.flatMap((issue, index) => {
    const linkedError = errors[index % errors.length];
    if (!linkedError) {
      return [];
    }

    const count = index % 3 === 0 ? 2 : 1;
    return Array.from({ length: count }, (_, assumptionIndex) => ({
      id: deterministicUuid("preview-assumption", issue.id, String(assumptionIndex)),
      createdAt: BASE_TIME,
      updatedAt: BASE_TIME,
      isConfirmed: assumptionIndex === 0,
      score: assumptionIndex === 0 ? 0.82 : 0.57,
      madeBy: assumptionIndex === 0 ? "preview-generator" : "seed-heuristic",
      issueId: issue.id,
      resultErrorId: linkedError.id,
    }));
  });
}

function buildDailyMetrics(
  projectId: string,
  executions: PrismaExecution[],
  results: PrismaResult[],
  errors: PrismaResultError[],
): DailyMetricRow[] {
  const executionById = new Map(executions.map((execution) => [execution.id, execution]));
  const errorByResultId = new Map(errors.map((error) => [error.resultId ?? "", error]));
  const aggregates = new Map<string, DailyMetricRow>();

  for (const result of results) {
    const execution = executionById.get(result.executionId);
    if (!execution) {
      continue;
    }

    const date = toDateOnlyIso(execution.startedAt);
    const key = `${date}:${execution.environment}:${execution.type}`;
    const metric =
      aggregates.get(key) ??
      {
        id: deterministicUuid("preview-metric", date, execution.environment, execution.type),
        date,
        projectId,
        environment: execution.environment,
        type: execution.type,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        totalDuration: 0,
        issuesBug: 0,
        issuesEnvironment: 0,
        issuesScript: 0,
        issuesPerformance: 0,
        issuesOther: 0,
      };

    metric.totalTests += 1;
    metric.totalDuration += result.duration;

    if (result.status === "passed") {
      metric.passedTests += 1;
    } else if (result.status === "failed") {
      metric.failedTests += 1;
      const error = errorByResultId.get(result.id);
      const category = error ? issueCategoryFromError(error) : "other";
      if (category === "bug") {
        metric.issuesBug += 1;
      } else if (category === "environment") {
        metric.issuesEnvironment += 1;
      } else if (category === "script") {
        metric.issuesScript += 1;
      } else if (category === "performance") {
        metric.issuesPerformance += 1;
      } else {
        metric.issuesOther += 1;
      }
    } else {
      metric.skippedTests += 1;
    }

    aggregates.set(key, metric);
  }

  return Array.from(aggregates.values()).sort((left, right) =>
    left.date.localeCompare(right.date),
  );
}
