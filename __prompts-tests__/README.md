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
├── helpers/                  # Shared usage collection and report writing
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

Evaluations load `config/ai/evaluation.baseline.json` independently from production. The shipped baseline matches production model and generation settings for the evaluated operations. Set `AI_EVAL_CONFIG_PATH` to select a complete replacement version 1 configuration; custom relative paths resolve from the working directory, while the shipped baseline resolves from the application root. Runner `model` and `temperature` overrides take precedence over file settings. Evaluation reports print suite, operation, prompt version, configuration source (`evaluation-baseline` or `custom`), profile, requested model, reasoning effort, and effective generation settings. They do not print credentials, prompt contents, or reasoning traces. Live Jest suites load `.env` and report as skipped when `OPENAI_API_KEY` is absent or blank, before reading datasets or invoking OpenAI. Mocked unit tests remain runnable without a real key. Direct runner calls still fail before provider invocation with an `OPENAI_API_KEY` message.

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

## Adding New Templates

1. Create a template file under the suite’s `templates/` directory.
2. Export the factory in the suite’s `templates/<suite>/index.ts`.
3. Regenerate datasets with the suite generator.
4. Run smoke tests for the suite.

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

## Classification and formatting evaluations

Stored-results analysis uses one smoke suite and one regression suite, each
parameterized over prompt v1.1.0 and v1.2.0. Model settings come from the independent
`config/ai/evaluation.baseline.json` configuration. Its classification profile uses GPT-6 Luna, Responses API, low
reasoning, and a 4000-token output limit. Use `AI_EVAL_CONFIG_PATH` for profile
comparisons; the runner also supports validated model/temperature overrides; a separate model-specific test file is unnecessary.

Error formatting has its own diagnostic-preservation suite in
`error-formatter/baseline.test.ts`. Its independent evaluation profile defaults to GPT-6 Luna with reasoning none and a 500-token
output limit. Solution suggestions and dashboard insights retain their existing
models.

Both suites share token accounting and timestamped JSON report writing. Reports
include effective model settings, operation, profile, and configuration source. Cached input and reasoning tokens are subsets
of input and output tokens respectively, and are not added to totals again.
