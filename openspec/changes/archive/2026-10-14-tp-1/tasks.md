# Tasks

## 1. Evaluation dependency

- [x] 1.1 Add the reference `@typesafe-ai/sdk` version `0.6.0` and update `package-lock.json`; verify installation resolves the pinned version and its declarations support `choice`, `TypeSafeClient`, and `systemOne` without modifying production source.

## 2. Reusable local reporting

- [x] 2.1 Create `__prompts-tests__/stored-results-analysis/runners/evaluation-report.ts` using `npm run new:file -- <path>`, with typed usage, aggregate metrics, per-case metadata, timestamped/provider/suite output and `latest.json`; add `__tests__/prompts/evaluation-report.test.ts` through the same scaffold and verify both files parse to the expected metrics in a temporary directory, including repeated latest-report updates and returned paths.
- [x] 2.2 Add `__prompts-tests__/**/reports/` to `.gitignore` outside the managed block and document report locations/fields in `__prompts-tests__/README.md`; verify `git check-ignore` recognizes representative TypeSafe smoke and regression report paths and no generated report is tracked.

## 3. Category evaluation runner

- [x] 3.1 Create `runners/typesafe-stored-results-analysis.ts` with separate prediction/result types, the reference criteria/priority, `jev-1.13.0` default and model override, and result-only provider state; add an SDK-mocked `__tests__/prompts/typesafe-stored-results-analysis.test.ts` and verify model selection, all result fields, null normalization, absence of ground-truth labels, and exact preservation of raw confidence/probabilities/model/token metadata. Use `npm run new:file -- <path>` for supported new files.
- [x] 3.2 Add bounded concurrency with ordered predictions, mismatch detection, accuracy, duration, usage aggregation, credential validation, and rejection of provider errors/invalid concurrency; extend the isolated runner tests to verify out-of-order completions, concurrency bounds, mismatch metrics, missing/blank keys, empty-input behavior, and failure propagation with no fabricated success output.
- [x] 3.3 Document the default model, model override, category policy, dataset reuse, and category-only/raw-confidence limitations in `__prompts-tests__/README.md`; verify the examples match the implemented options and do not describe the reference PR's later production baseline as this branch's behavior.

## 4. Opt-in suites and configuration

- [x] 4.1 Create `typesafeTestEnv.ts` and the v1.1.0 TypeSafe smoke/regression suites through `npm run new:file -- <path>`, using existing dataset paths, nonempty-dataset checks, missing/blank-key skips before dataset reads, and reports written before acceptance assertions; verify isolated suite wiring with mocked provider responses covers all-correct smoke acceptance, regression boundary at 90 percent, below-threshold reports, and credential skips without provider calls or an OpenAI-key requirement.
- [x] 4.2 Add `stored-results-analysis-typesafe` to `jest.prompts.config.ts` and exclude TypeSafe suites from the existing stored-results-analysis project; verify Jest `--listTests` for each project and ordinary Jest show that only the TypeSafe project collects its live suites, and execute the TypeSafe project with absent/blank credentials in an isolated environment to confirm both suites skip before reading datasets. Keep configuration/isolation verification tests in `__tests__/prompts/` where deterministic checks are needed.
- [x] 4.3 Add `TYPESAFE_API_KEY` to `.env.example` and document dataset generation, project-specific smoke/regression commands, timeouts, thresholds, report interpretation, and all-project execution when a TypeSafe key is configured; verify the documented commands select the intended suites and generated datasets remain ignored.

## 5. Integration verification and evidence

- [x] 5.1 Run the focused runner, reporting, and suite-isolation tests, then `npm run type-check`, `npm run lint`, `npm test`, and `npm run build`; verify all required checks succeed and record any pre-existing failures distinctly without representing them as successful checks.
- [x] 5.2 Review the final diff for evaluation-only scope and run `git diff --check` plus `openspec validate tp-1 --strict`; verify no production service, Prisma, REST/MCP, or confidence-contract change and no tracked generated dataset/report.
- [x] 5.3 Record delivery evidence separately for isolated checks and live provider evaluation: if no live run is performed, explicitly record “live provider evaluations not run”; if performed, run the documented smoke/regression commands with generated datasets and record actual model, report paths, metrics, and acceptance outcomes without claiming full production-analysis parity. Completion of this task requires an explicit evidence record, not a live run.

## Delivery Evidence

- Isolated focused checks passed after review fixes: 4 Jest suites, 25 tests, including execution with a configured TypeSafe key.
- `npm run type-check` and `npm run build` passed.
- `npm run lint` passed with two warnings in the unchanged `__tests__/services/dashboardService.aggregation.test.ts` file.
- `npm test -- --runInBand` passed after review fixes: 67 suites, 461 tests. Route tests ran outside the sandbox to permit local port binding.
- Jest collection checks confirmed that the existing stored-results project excludes the TypeSafe suites, the TypeSafe project collects only its smoke/regression suites, and ordinary Jest collects neither. With both `OPENAI_API_KEY` and `TYPESAFE_API_KEY` blank, the TypeSafe project skipped both suites.
- `git diff --check` and `openspec validate tp-1 --strict` passed; no generated dataset or report is tracked.
- Live provider evaluations not run; no measured provider accuracy is claimed.
