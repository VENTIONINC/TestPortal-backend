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

TypeSafe classification tests additionally require:

```bash
export TYPESAFE_API_KEY="..."
```

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
npx jest --config jest.prompts.config.ts --testPathPattern=typesafe\.smoke\.test\.ts$ --selectProjects stored-results-analysis-typesafe
```

**Regression tests**:

```bash
npx jest --config jest.prompts.config.ts --testPathPattern=regression\.test\.ts$ --selectProjects stored-results-analysis
npx jest --config jest.prompts.config.ts --testPathPattern=regression\.test\.ts$ --selectProjects error-solution
npx jest --config jest.prompts.config.ts --testPathPattern=typesafe\.regression\.test\.ts$ --selectProjects stored-results-analysis-typesafe
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

## Local evaluation reports

Stored-results analysis tests write timestamped JSON reports plus `latest.json`
under `__prompts-tests__/stored-results-analysis/reports/<provider>/<suite>/`.
Reports include model, duration, request count, token usage, accuracy, and per-case
outputs. The reports directory is gitignored.

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

## Alternative classification experiment (issue #111)

The opt-in `stored-results-analysis-typesafe` project evaluates Jev category
predictions using the shared datasets. It does not replace production analysis
(prompt v1.2.0 with GPT-5.6 Luna). Its confidence and category probabilities do
not provide the current conclusion or error-quality fields and are not a
drop-in replacement for the full analysis contract. Persistence, confidence
semantics, and partial-analysis behavior require design before integration.
See https://github.com/VENTIONINC/TestPortal-backend/issues/111.
