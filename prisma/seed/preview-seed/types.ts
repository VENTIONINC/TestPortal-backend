import type {
  PrismaAssumption,
  PrismaExecution,
  PrismaIssue,
  PrismaProject,
  PrismaResult,
  PrismaResultError,
  PrismaSpec,
} from "../../../src/types/database";

export interface DailyMetricRow {
  id: string;
  date: string;
  projectId: string;
  environment: string;
  type: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalDuration: number;
  issuesBug: number;
  issuesEnvironment: number;
  issuesScript: number;
  issuesPerformance: number;
  issuesOther: number;
}

export interface SeedArtifactMeta {
  generatorVersion: string;
  profile: string;
  sourceFixtures: string[];
  generatedAt: string;
  seedKey: string;
  syntheticOwnerId: string;
  rowCounts: {
    executions: number;
    specs: number;
    results: number;
    resultErrors: number;
    issues: number;
    assumptions: number;
    dailyMetrics: number;
  };
}

export interface PreviewSeedArtifact {
  meta: SeedArtifactMeta;
  project: PrismaProject;
  executions: PrismaExecution[];
  specs: PrismaSpec[];
  results: PrismaResult[];
  resultErrors: PrismaResultError[];
  issues: PrismaIssue[];
  assumptions: PrismaAssumption[];
  dailyMetrics: DailyMetricRow[];
}

export interface FixtureResultTemplate {
  status: "passed" | "failed" | "skipped";
  duration: number;
  reportPortalLink: string | null;
  errorMessage: string | null;
  errorLocationFile: string;
  errorLocationLine: number;
  errorSnippet: string | null;
}

export interface FixtureCaseTemplate {
  key: string;
  title: string;
  file: string;
  tags: string[];
  annotations: string[];
  suite: string;
  preferredEnvironment: string;
  provider: string;
  version: string;
  resultTemplates: FixtureResultTemplate[];
}

export interface LoadedFixtures {
  fixtureNames: string[];
  cases: FixtureCaseTemplate[];
}
