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
The opt-in OpenRouter Decisions suites use `OPENROUTER_API_KEY` and skip before
reading datasets when it is missing or blank. Set `OPENROUTER_EVAL_PROFILE` to
`jev` or `openai` to select a profile; with a key and no profile, the default is
`openai`. These suites do not require `OPENAI_API_KEY` or `TYPESAFE_API_KEY`.

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

## OpenRouter Decisions adapter

The evaluation adapter uses OpenRouter's alpha Decisions endpoint:
`POST https://openrouter.ai/api/alpha/decisions`. It requires a nonblank
`OPENROUTER_API_KEY`; it does not read `OPENAI_API_KEY` or
`TYPESAFE_API_KEY`. The request carries a selected model, `state`, and a
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
  "model": "typesafe/jev-1.13",
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

The adapter always disables OpenRouter provider fallback. Its default timeout is
30 seconds per attempt and its default retry count is zero; explicit retry
overrides are bounded to three retries. It validates question/answer names and
types, selected criteria, finite values, complete normalized probability
distributions, scores, returned model identity, and supplied usage/cost. Missing
usage, cost, or upstream identity stays unavailable rather than being
zero-filled or inferred. Authentication, credit, rate-limit, timeout, network,
and upstream failures use stable error kinds. Malformed, incomplete, and
undocumented refusal-shaped responses fail as `invalid_response`; the current
OpenRouter Decisions contract does not define a refusal payload shape.

This is OpenRouter's Decisions wire contract even for the `openai` evaluation
profile. It is not the direct OpenAI Decisions API contract: direct OpenAI uses
its own endpoint and request/response schema, and its `input` or direct-provider
payloads are rejected by this adapter. See the [OpenRouter Decisions
reference](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request)
and [OpenAI Decisions documentation](https://developers.openai.com/api/docs/guides/decisions).

### OpenRouter evaluation profiles

The shared stored-result category runner exposes two explicit profiles:

| Profile | OpenRouter model |
| --- | --- |
| `jev` | `typesafe/jev-1.13` |
| `openai` | `openai/gpt-6-luna-decisions` |

Live-suite selection uses `OPENROUTER_EVAL_PROFILE=jev|openai`; if omitted, it
selects `openai`. Unknown values fail instead of choosing a model implicitly.
Both profiles use concurrency 8, a 30-second timeout per attempt, and zero
retries by default. Concurrency and timeout may be overridden with validated
positive integers.

The OpenRouter runner evaluates only the five-category choice. It uses the
existing priority `infra`, `performance`, `script`, `bug`, `other`, with explicit
network and infrastructure signals ahead of generic timeouts. Test names, tags,
expected labels, and production confidence constraints stay local. The direct
TypeSafe evaluation and its `TYPESAFE_API_KEY` behavior remain independent and
unchanged.

The shared v1.1.0 baseline contains 4 smoke and 40 regression cases. It has no
performance-category template, so these live datasets do not measure
performance classification coverage. Mocked policy fixtures only check how the
question and evidence are constructed; they do not establish model accuracy.

### OpenRouter smoke and regression

Generate the common datasets once. Set the OpenRouter key only when you intend
to make live requests; choose `jev` or `openai` for each run. Both profiles use
the exact same generated files:

```bash
npx tsx __prompts-tests__/stored-results-analysis/generate-datasets.ts
export OPENROUTER_API_KEY="..."
export OPENROUTER_EVAL_PROFILE=jev
npx jest --config jest.prompts.config.ts --selectProjects stored-results-analysis-openrouter-decisions --testPathPattern='openrouter\.smoke\.test\.ts$'
npx jest --config jest.prompts.config.ts --selectProjects stored-results-analysis-openrouter-decisions --testPathPattern='openrouter\.regression\.test\.ts$'
export OPENROUTER_EVAL_PROFILE=openai
npx jest --config jest.prompts.config.ts --selectProjects stored-results-analysis-openrouter-decisions --testPathPattern='openrouter\.smoke\.test\.ts$'
npx jest --config jest.prompts.config.ts --selectProjects stored-results-analysis-openrouter-decisions --testPathPattern='openrouter\.regression\.test\.ts$'
```

When the key is absent or whitespace, the live project is skipped before it
reads either dataset. An invalid supplied profile fails clearly. These commands
run only the two TP-5 profiles; Microsoft is outside TP-5.

### OpenRouter reports and comparisons

Completed runs write a timestamped JSON report and update `latest.json` under
`__prompts-tests__/stored-results-analysis/reports/openrouter/<profile>/<suite>/`.
The report preserves each raw choice and probability distribution, requested
and returned model, supplied provider/request identity, actual request/attempt
counts, and usage/cost when OpenRouter provides them. Missing billing fields
remain `null`; they are not treated as zero or estimated.

Compare reports only when both profiles ran the same suite and dataset version,
content fingerprint, category-policy version, and complete case identities. Run
the local comparison with the Jev report first and the OpenAI-profile report
second:

```bash
npx tsx __prompts-tests__/stored-results-analysis/runners/compare-openrouter-reports.ts \
  __prompts-tests__/stored-results-analysis/reports/openrouter/jev/regression/latest.json \
  __prompts-tests__/stored-results-analysis/reports/openrouter/openai/regression/latest.json
```

The comparison prints separate model summaries, mismatches, accuracy, duration,
request/attempt counts, and differences for usage fields available in both
reports. A missing usage or cost value stays unavailable in the summary.
Probabilities are the provider's raw distribution over the named criteria;
they are evaluation evidence and are not calibrated to the production
`analysisConfidence` scale.

Observed duration includes OpenRouter gateway and routing time, and reported
cost/usage is only what the gateway supplied. These reports do not establish
direct-provider latency or billing. Earlier direct TypeSafe reports under
`reports/typesafe/` lack the dataset fingerprint, category-policy version, and
complete case identity metadata required by this comparison. They remain
historical evidence and are not upgraded with invented provenance.

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
