import fs from "node:fs";
import path from "node:path";
import { FIXED_PROFILE, stableKey } from "./utils";
import type {
  FixtureCaseTemplate,
  FixtureResultTemplate,
  LoadedFixtures,
} from "./types";

interface PlaywrightSuite {
  suites?: PlaywrightSuite[];
  specs?: PlaywrightSpec[];
}

interface PlaywrightSpec {
  id?: string;
  file?: string;
  line?: number;
  title?: string;
  tags?: string[];
  tests?: PlaywrightTest[];
}

interface PlaywrightTest {
  annotations?: Array<{ type?: string; description?: string }>;
  results?: PlaywrightResult[];
}

interface PlaywrightResult {
  status?: string;
  duration?: number;
  startTime?: string;
  reportPortalLink?: string;
  allureReportLink?: string;
  error?: {
    message?: string;
    stack?: string;
    snippet?: string;
    location?: {
      file?: string;
      line?: number;
    };
  };
}

interface CtrfDocument {
  results?: {
    tool?: {
      name?: string;
      version?: string;
    };
    tests?: CtrfTest[];
  };
}

interface CtrfTest {
  name?: string;
  status?: string;
  duration?: number;
  suite?: string;
  filePath?: string;
  tags?: string[];
  message?: string;
}

export function loadFixtureTemplates(fixturesDir: string): LoadedFixtures {
  const fixtureNames = fs
    .readdirSync(fixturesDir)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  const cases: FixtureCaseTemplate[] = [];

  for (const fixtureName of fixtureNames) {
    const absolutePath = path.join(fixturesDir, fixtureName);
    const parsed = JSON.parse(
      fs.readFileSync(absolutePath, "utf8"),
    ) as PlaywrightSuite | CtrfDocument;

    const loadedCases = isCtrf(parsed)
      ? loadCtrfCases(parsed)
      : loadPlaywrightCases(parsed);

    cases.push(...loadedCases);
  }

  return {
    fixtureNames,
    cases: dedupeCases(cases),
  };
}

function isCtrf(document: PlaywrightSuite | CtrfDocument): document is CtrfDocument {
  return "results" in document;
}

function loadPlaywrightCases(document: PlaywrightSuite): FixtureCaseTemplate[] {
  const templates: FixtureCaseTemplate[] = [];

  const visitSuites = (suites: PlaywrightSuite[]): void => {
    for (const suite of suites) {
      if (suite.suites) {
        visitSuites(suite.suites);
      }

      for (const spec of suite.specs ?? []) {
        const file = spec.file ?? "tests/generated.spec.ts";
        const title = spec.title ?? "Generated Fixture Case";
        const key = extractSpecKey(title, spec.id, file);
        const annotations = (spec.tests?.[0]?.annotations ?? [])
          .map((annotation) =>
            [annotation.type, annotation.description].filter(Boolean).join(":"),
          )
          .filter((value): value is string => value.length > 0);

        const resultTemplates = (spec.tests ?? []).flatMap((test) =>
          (test.results ?? []).map((result) =>
            normalizeResultTemplate({
              status: normalizeStatus(result.status),
              duration: result.duration ?? 0,
              reportPortalLink:
                result.reportPortalLink ?? result.allureReportLink ?? null,
              errorMessage: result.error?.message ?? null,
              errorLocationFile: result.error?.location?.file ?? file,
              errorLocationLine: result.error?.location?.line ?? spec.line ?? 1,
              errorSnippet: result.error?.snippet ?? result.error?.stack ?? null,
            }),
          ),
        );

        templates.push({
          key,
          title,
          file,
          tags: spec.tags ?? [],
          annotations,
          suite: inferSuiteName(file),
          preferredEnvironment: inferEnvironment(file, title),
          provider: "Playwright",
          version: "1.43.0",
          resultTemplates:
            resultTemplates.length > 0
              ? resultTemplates
              : [
                  normalizeResultTemplate({
                    status: "passed",
                    duration: 500,
                    reportPortalLink: null,
                    errorMessage: null,
                    errorLocationFile: file,
                    errorLocationLine: spec.line ?? 1,
                    errorSnippet: null,
                  }),
                ],
        });
      }
    }
  };

  visitSuites([document]);
  return templates;
}

function loadCtrfCases(document: CtrfDocument): FixtureCaseTemplate[] {
  return (document.results?.tests ?? []).map((test, index) => {
    const file = test.filePath ?? `/project/tests/generated-${index}.spec.ts`;
    const title = test.name ?? `Generated CTRF Case ${index + 1}`;
    const suite = test.suite ?? inferSuiteName(file);
    return {
      key: extractSpecKey(title, undefined, file),
      title,
      file,
      tags: test.tags ?? [],
      annotations: [],
      suite,
      preferredEnvironment: inferEnvironment(file, title),
      provider: document.results?.tool?.name ?? "Playwright",
      version: document.results?.tool?.version ?? "1.43.0",
      resultTemplates: [
        normalizeResultTemplate({
          status: normalizeStatus(test.status),
          duration: test.duration ?? 0,
          reportPortalLink: null,
          errorMessage: test.status === "failed" ? test.message ?? title : null,
          errorLocationFile: file,
          errorLocationLine: 1,
          errorSnippet: test.message ?? null,
        }),
      ],
    };
  });
}

function normalizeResultTemplate(
  template: FixtureResultTemplate,
): FixtureResultTemplate {
  return {
    ...template,
    duration: Math.max(0, template.duration),
  };
}

function normalizeStatus(status: string | undefined): FixtureResultTemplate["status"] {
  if (status === "failed" || status === "passed" || status === "skipped") {
    return status;
  }
  return "passed";
}

function extractSpecKey(
  title: string,
  explicitId: string | undefined,
  file: string,
): string {
  const titleMatch = title.match(/C\d+/);
  return titleMatch?.[0] ?? explicitId ?? stableKey(title, file).slice(0, 12);
}

function inferSuiteName(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const withoutExtension = path.posix.basename(
    normalized,
    path.posix.extname(normalized),
  );
  return withoutExtension || FIXED_PROFILE.projectName;
}

function inferEnvironment(filePath: string, title: string): string {
  const combined = `${filePath} ${title}`.toLowerCase();
  if (combined.includes("prod")) {
    return "production";
  }
  if (combined.includes("stage") || combined.includes("staging")) {
    return "staging";
  }
  if (combined.includes("mobile")) {
    return "mobile";
  }
  return "qa";
}

function dedupeCases(cases: FixtureCaseTemplate[]): FixtureCaseTemplate[] {
  const byKey = new Map<string, FixtureCaseTemplate>();

  for (const testCase of cases) {
    const compoundKey = `${testCase.key}:${testCase.file}:${testCase.title}`;
    const existing = byKey.get(compoundKey);
    if (!existing) {
      byKey.set(compoundKey, testCase);
      continue;
    }

    existing.tags = Array.from(new Set([...existing.tags, ...testCase.tags]));
    existing.annotations = Array.from(
      new Set([...existing.annotations, ...testCase.annotations]),
    );
    existing.resultTemplates.push(...testCase.resultTemplates);
  }

  return Array.from(byKey.values());
}
