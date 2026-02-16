---
name: prompts-testing
description: Run and troubleshoot prompt evaluation suites for stored-results-analysis and error-solution. Use for prompt tests, dataset generation, smoke/regression execution, Jest prompt config, OPENAI_API_KEY issues, and prompt contract failures.
---

# prompts-testing

Use this skill when tasks mention prompt evaluation, LLM prompt quality checks, smoke/regression prompt runs, dataset generation, or failures in `__prompts-tests__`.

## When to use

Trigger on requests containing keywords like:

- prompt tests
- smoke test / regression test
- `jest.prompts.config.ts`
- `__prompts-tests__`
- `stored-results-analysis`
- `error-solution`
- generate datasets
- `OPENAI_API_KEY`
- "Missing output for id"

## What this skill does

1. Validates prerequisites for prompt tests.
2. Generates suite datasets before test execution.
3. Runs suite-specific smoke/regression/all prompt tests.
4. Reports failures with actionable next steps.
5. Applies minimal troubleshooting for common prompt-test issues.

## Repository-specific commands

Run from repository root.

### Prerequisite

```bash
export OPENAI_API_KEY="sk-..."
```

### Generate datasets

```bash
npx tsx __prompts-tests__/stored-results-analysis/generate-datasets.ts
npx tsx __prompts-tests__/error-solution/generate-datasets.ts
```

### Run smoke tests

```bash
npx jest --config jest.prompts.config.ts --testPathPattern=smoke\.test\.ts$ --selectProjects stored-results-analysis
npx jest --config jest.prompts.config.ts --testPathPattern=smoke\.test\.ts$ --selectProjects error-solution
```

### Run regression tests

```bash
npx jest --config jest.prompts.config.ts --testPathPattern=regression\.test\.ts$ --selectProjects stored-results-analysis
npx jest --config jest.prompts.config.ts --testPathPattern=regression\.test\.ts$ --selectProjects error-solution
```

### Run all tests in a suite

```bash
npx jest --config jest.prompts.config.ts --selectProjects stored-results-analysis
npx jest --config jest.prompts.config.ts --selectProjects error-solution
```

## Standard execution flow

1. Check `OPENAI_API_KEY` availability.
2. Generate datasets for the target suite.
3. Run smoke tests first.
4. Run regression tests.
5. If failures occur, capture failing IDs and classify root cause (data, prompt contract, runtime, env).

## Common failures and fixes

- `ENOENT ... datasets/.../smoke.json` or `regression.json`

  - Cause: datasets not generated for that suite.
  - Fix: run suite generator script, then rerun Jest.

- `OPENAI_API_KEY` missing

  - Cause: environment variable not set in current shell/session.
  - Fix: export key and rerun tests in same shell.

- `Missing output for id=...`

  - Cause: model response incomplete or truncated.
  - Fix: rerun, reduce batch size where applicable, ensure prompt contract enforces full coverage.

- Jest warning: open handles / forced worker exit
  - Cause: leaked timers/handles in test runtime.
  - Fix: rerun with `--detectOpenHandles` for diagnostics.

## Agent response pattern

When executing this skill:

1. Show exact command being run.
2. Report pass/fail per suite (`stored-results-analysis`, `error-solution`).
3. Include concise blocker + fix if command fails.
4. Suggest immediate next command (smoke -> regression -> all suite).

## Examples

### Example A: run stored-results-analysis only

```bash
npx tsx __prompts-tests__/stored-results-analysis/generate-datasets.ts
npx jest --config jest.prompts.config.ts --selectProjects stored-results-analysis
```

### Example B: run smoke-only for both suites

```bash
npx jest --config jest.prompts.config.ts --testPathPattern=smoke\.test\.ts$ --selectProjects stored-results-analysis
npx jest --config jest.prompts.config.ts --testPathPattern=smoke\.test\.ts$ --selectProjects error-solution
```

### Example C: debug hanging/leaking tests

```bash
npx jest --config jest.prompts.config.ts --selectProjects stored-results-analysis --detectOpenHandles
```
