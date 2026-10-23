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

The OpenAI Decisions suites use `OPENROUTER_API_KEY` and skip before reading
datasets when it is missing or blank. They always use `openai/gpt-6-luna-decisions`
through OpenRouter and do not require the direct `OPENAI_API_KEY`.

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

## OpenRouter Decisions adapter

The evaluation adapter uses OpenRouter's alpha Decisions endpoint:
`POST https://openrouter.ai/api/alpha/decisions`. It requires a nonblank
`OPENROUTER_API_KEY`; it does not read `OPENAI_API_KEY`. The request carries a
selected model, `state`, and a
nonempty map of named questions. State may be a string, JSON object, or JSON
array. The supported question types are:

- `noul`: a boolean proposition, answered with its probability in `noul`;
- `choice`: named options in a criteria object, answered with a selected option,
  confidence, and probabilities for each option;
- `score`: ordered criteria strings, answered with a score, confidence, legend,
  and probabilities for each zero-based rubric index.

For example, this request matches the adapter's validated type surface:

```json
{
  "model": "openai/gpt-6-luna-decisions",
  "state": { "status": "failed", "duration": 1200 },
  "questions": {
    "is_bug": {
      "type": "noul",
      "instructions": "Is this a bug?",
      "criteria": { "false": "No", "true": "Yes" }
    },
    "category": {
      "type": "choice",
      "instructions": "Choose a category",
      "criteria": { "bug": "Application defect", "other": "Unclear" }
    },
    "severity": {
      "type": "score",
      "instructions": "Rate severity",
      "criteria": ["low", "high"]
    }
  },
  "provider": { "allow_fallbacks": false }
}
```

The shared adapter pins `@openrouter/sdk` to `1.4.25` and submits with
`OpenRouter.alpha.decisions.create`. It injects an SDK `HTTPClient` at the
adapter boundary; tests provide its fetcher to exercise real SDK serialization,
response parsing, and status handling. The operation targets the explicit
`https://openrouter.ai` origin and disables SDK retries. The adapter owns the
bounded retry policy so production and evaluation can keep zero retries while
the generic boundary retains up to three transient retries.

The adapter always disables OpenRouter provider fallback. Its default timeout is
30 seconds per attempt and covers request submission and response-body reading.
It captures the original response before SDK parsing so the local validator can
preserve wire usage such as `total_tokens` and continue accepting valid missing
or partial usage. Missing usage, cost, or upstream identity stays unavailable
rather than being zero-filled or inferred. The local validator correlates
question/answer names and types, checks selected criteria, finite values,
complete normalized probability distributions, score legends, returned model
identity, and supplied usage/cost. SDK errors are converted to stable safe
error kinds using exported SDK error types and captured HTTP status; raw SDK
causes and response bodies are not returned. Malformed, incomplete, and
undocumented refusal-shaped responses fail as `invalid_response`; the current
OpenRouter Decisions contract does not define a refusal payload shape.

This is OpenRouter's Decisions wire contract for the evaluation and production classifier. It is
not the direct OpenAI Decisions API contract: direct OpenAI uses
its own endpoint and request/response schema, and its `input` or direct-provider
payloads are rejected by this adapter. See the [OpenRouter Decisions
reference](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request)
and [OpenAI Decisions documentation](https://developers.openai.com/api/docs/guides/decisions).

### OpenAI Decisions smoke and regression

The stored-result runner supports only the pinned `openai/gpt-6-luna-decisions`
model. Concurrency defaults to 8, timeout to 30 seconds per attempt, and retries
to zero. Concurrency and timeout overrides are validated; arbitrary model
and unsupported profile overrides are rejected. Provider fallback is disabled.

Generate the shared v1.1.0 datasets, then set the OpenRouter key only when you
intend to make live requests:

```bash
npx tsx __prompts-tests__/stored-results-analysis/generate-datasets.ts
export OPENROUTER_API_KEY="..."
npx jest --config jest.prompts.config.ts --selectProjects stored-results-analysis-openrouter-decisions --testPathPattern='openrouter\.smoke\.test\.ts$'
npx jest --config jest.prompts.config.ts --selectProjects stored-results-analysis-openrouter-decisions --testPathPattern='openrouter\.regression\.test\.ts$'
```

Without a nonblank key, these suites skip before dataset reads or network calls.
Ordinary `npm test` excludes live prompt suites. The direct generative OpenAI
projects keep their separate `OPENAI_API_KEY` requirement.

The generator currently produces 4 smoke and 40 regression cases covering
infra, script, bug, and other; it has no dedicated performance template.
Smoke requires every category to match; regression
requires at least 90% accuracy. The runner submits diagnostic result evidence
only; expected labels and case names stay local. It shares production's category
policy and priority: `infra`, `performance`, `script`, `bug`, `other`.

Predictions are category-only and retain raw confidence and probabilities;
evaluation does not calibrate them or produce conclusions or error-quality
ratings. Mocked checks establish request and scoring behavior, not live accuracy.
HTTP 413 and context-limit HTTP 400 failures retain their status and attempts
without retrying or truncating evidence. A failed request produces no completed
report; in-flight requests settle and no new work is scheduled after failure.

### OpenAI evaluation reports

Completed runs write timestamped JSON and `latest.json` under
`__prompts-tests__/stored-results-analysis/reports/openrouter/openai/<suite>/`
before checking accuracy thresholds. Reports retain dataset version and content
fingerprint, policy version, expected and predicted categories, raw validated
answers, requested/returned model identities, evaluation timestamps, supplied
upstream identity, request/attempt counts, duration, and actual usage/cost.
Unavailable metrics stay `null`; credentials and full provider bodies are excluded.
Datasets and reports are ignored by Git.

A failed run leaves `latest.json` pointing to the previous successful run, so
use timestamped reports as evidence. Latency includes OpenRouter routing time;
model aliases may change, so retain returned model IDs and timestamps. Historical
reports produced before the first-release policy version reset must be kept
separate from new runs, even if their policy version strings match. Cross-provider
comparison tooling and alternate-provider evaluation suites have been removed.

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
