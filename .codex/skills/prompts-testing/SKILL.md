---
name: prompts-testing
description: Run and troubleshoot prompt evaluation suites for stored-results-analysis and error-solution. Use for prompt tests, dataset generation, smoke/regression execution, Jest prompt config, OPENAI_API_KEY issues, and prompt contract failures.
---

# Prompts Testing

Use this skill when tasks mention prompt evaluation, LLM prompt quality checks, smoke or regression prompt runs, dataset generation, or failures in `__prompts-tests__`.

## Trigger Phrases

- prompt tests
- smoke test
- regression test
- `jest.prompts.config.ts`
- `__prompts-tests__`
- `stored-results-analysis`
- `error-solution`
- generate datasets
- `OPENAI_API_KEY`
- "Missing output for id"

## Repository Commands

Run from the repository root.

```bash
npx tsx __prompts-tests__/stored-results-analysis/generate-datasets.ts
npx tsx __prompts-tests__/error-solution/generate-datasets.ts
npx jest --config jest.prompts.config.ts --testPathPattern=smoke\\.test\\.ts$ --selectProjects stored-results-analysis
npx jest --config jest.prompts.config.ts --testPathPattern=smoke\\.test\\.ts$ --selectProjects error-solution
npx jest --config jest.prompts.config.ts --testPathPattern=regression\\.test\\.ts$ --selectProjects stored-results-analysis
npx jest --config jest.prompts.config.ts --testPathPattern=regression\\.test\\.ts$ --selectProjects error-solution
```

## Procedure

1. Check whether `OPENAI_API_KEY` is available without printing its value.
2. Generate datasets for the target suite before running tests.
3. Run smoke tests first.
4. Run regression tests after smoke tests pass.
5. If failures occur, capture failing IDs and classify the cause as data, prompt contract, runtime, or environment.

## Common Failures

- `ENOENT ... datasets/.../smoke.json` or `regression.json`: generate datasets for that suite.
- `OPENAI_API_KEY` missing: export the key in the same shell/session and rerun.
- `Missing output for id=...`: rerun, reduce batch size where applicable, and verify the prompt contract enforces full coverage.
- Jest open-handle warnings: rerun the affected suite with `--detectOpenHandles`.

## Output

- Show the exact command being run.
- Report pass/fail per suite.
- Include a concise blocker and fix when a command fails.
- Suggest the immediate next command, usually smoke to regression to full suite.
