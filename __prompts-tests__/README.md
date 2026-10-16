# Prompt Testing Framework

Automated testing framework for LLM prompts used in the test-portal-be project. Supports multiple prompt suites (e.g. `stored-results-analysis`, `error-solution`).

## Overview

This framework enables:

- **Template-based test generation** - Create variations of test cases using factory functions
- **Dataset generation** - Automated creation of smoke and regression test datasets
- **LLM validation** - Invoke OpenAI models with structured output validation
- **Expectations checking** - Validate output contracts and quality rules

## Directory Structure

```
__prompts-tests__/
├── <suite>/
│   ├── generate-datasets.ts
│   ├── datasets/
│   │   └── <suite>/
│   │       ├── smoke.json
│   │       └── regression.json
│   ├── runners/
│   └── vX.Y.Z/
│       ├── smoke.test.ts
│       ├── regression.test.ts
│       └── templates/
```

## Quick Start

### 1. Environment Setup

Ensure you have the required environment variable:

```bash
export OPENAI_API_KEY="sk-..."
```

The TypeSafe category evaluation uses the independent `TYPESAFE_API_KEY`. It
does not require `OPENAI_API_KEY`; its live suites skip before reading datasets
or contacting the provider when the TypeSafe key is missing or blank. An
optional `TYPESAFE_DEFAULT_MODEL` overrides the pinned evaluation model.

### 2. Generate Datasets

Use the suite-specific generator:

```bash
npx tsx __prompts-tests__/stored-results-analysis/generate-datasets.ts
npx tsx __prompts-tests__/error-solution/generate-datasets.ts
```

### 3. Run Tests

Pass the project name to Jest via `--selectProjects`:

**Smoke tests**:

```bash
npx jest --config jest.prompts.config.ts --testPathPattern=smoke\.test\.ts$ --selectProjects stored-results-analysis
npx jest --config jest.prompts.config.ts --testPathPattern=smoke\.test\.ts$ --selectProjects error-solution
```

**Regression tests**:

```bash
npx jest --config jest.prompts.config.ts --testPathPattern=regression\.test\.ts$ --selectProjects stored-results-analysis
npx jest --config jest.prompts.config.ts --testPathPattern=regression\.test\.ts$ --selectProjects error-solution
```

**All tests in a suite**:

```bash
npx jest --config jest.prompts.config.ts --selectProjects stored-results-analysis
npx jest --config jest.prompts.config.ts --selectProjects error-solution
```

### TypeSafe Smoke And Regression

Generate the shared v1.1.0 datasets with the existing generator, then set a
TypeSafe API key when you intend to make live provider requests:

```bash
npx tsx __prompts-tests__/stored-results-analysis/generate-datasets.ts
export TYPESAFE_API_KEY="..."
```

Run either TypeSafe suite by selecting its isolated Jest project and matching
the desired suite file:

```bash
npx jest --config jest.prompts.config.ts --selectProjects stored-results-analysis-typesafe --testPathPattern='typesafe\.smoke\.test\.ts$'
npx jest --config jest.prompts.config.ts --selectProjects stored-results-analysis-typesafe --testPathPattern='typesafe\.regression\.test\.ts$'
```

Smoke has a 120-second timeout and requires every category prediction to be
correct. Regression has a 300-second timeout and accepts accuracy of at least
90%. Both suites write timestamped and `latest.json` reports before checking
their thresholds, so a below-threshold regression report remains available.
The generated datasets remain under the existing stored-results-analysis
dataset paths and are ignored by Git.

To run every prompt project, including TypeSafe when its key is configured:

```bash
npx jest --config jest.prompts.config.ts
```

When `TYPESAFE_API_KEY` is missing or blank, the TypeSafe suites are skipped
before dataset reads and provider requests. The existing OpenAI-backed projects
keep their separate `OPENAI_API_KEY` requirement. Ordinary `npm test` excludes
all prompt suites, including TypeSafe.

## Adding New Templates

1. Create a template file under the suite’s `templates/` directory.
2. Export the factory in the suite’s `templates/<suite>/index.ts`.
3. Regenerate datasets with the suite generator.
4. Run smoke tests for the suite.

## Evaluation Reports

Evaluation runners write reports under
`__prompts-tests__/stored-results-analysis/reports/<provider>/<suite>/`. Each
completed run writes a timestamped JSON file and updates `latest.json` for that
provider and suite. Reports include the provider, model, suite, generation time,
case and correct counts, category accuracy, duration, request count, aggregate
input/output/total token usage, and per-case expected and predicted categories,
correctness, raw provider confidence, category probabilities, and token usage.
Reports contain evaluation results only and do not include credentials.
Generated report directories are ignored by Git.

## TypeSafe Category Evaluation

The opt-in Jev evaluation runner reuses the v1.1.0 smoke and regression
datasets at
`__prompts-tests__/stored-results-analysis/datasets/stored-results-analysis/`;
it does not create provider-specific copies. Its reproducible default model is
`jev-1.13.0`. The runner accepts a `model` option for an explicit override and
also honors `TYPESAFE_DEFAULT_MODEL`; the explicit option takes precedence.

The runner classifies result evidence using this priority: `infra`,
`performance`, `script`, `bug`, then `other`. Explicit network, DNS, connection,
TLS, deployment, credential, and external authentication failures are
infrastructure evidence. Timeouts without explicit network error codes and
performance constraints are performance evidence. Automation defects are
script evidence, application defects are bugs, and insufficient or conflicting
evidence is `other`.

Predictions are category-only. The provider receives test-result fields, while
expected categories stay local for scoring. Raw provider confidence and
category probabilities are recorded as evaluation metadata; they are not
calibrated or converted to the production integer 1–5 `analysisConfidence`
scale. The evaluation does not produce conclusions, error-quality ratings, or
explanations, and it does not change the production analysis contract or model.

## Troubleshooting

### Tests Failing with "Missing output for id=..."

The LLM didn't return analysis for all input test cases. Check:

- OPENAI_API_KEY is set correctly
- No rate limiting issues
- Prompt contract is clear about expected output length

### Timeout Errors

Increase Jest timeout in test files:

```typescript
jest.setTimeout(300_000); // 5 minutes
```
