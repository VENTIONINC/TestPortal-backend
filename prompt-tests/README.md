# Prompt Testing Framework

Automated testing framework for LLM prompts used in the test-portal-be project. Currently supports testing the `stored-results-analysis` prompt (v1.1.0).

## Overview

This framework enables:
- **Template-based test generation** - Create variations of test cases using factory functions
- **Dataset generation** - Automated creation of smoke and regression test datasets
- **LLM validation** - Invoke OpenAI models with structured output validation
- **Expectations checking** - Validate category, confidence, error quality, and other outputs

## Directory Structure

```
prompt-tests/
├── templates/                          # Test case generators
│   ├── types.ts                        # Shared TypeScript types
│   ├── util.ts                         # Helper functions
│   └── stored-results-analysis/        # Templates for specific prompt
│       ├── index.ts                    # Export all factories
│       ├── infra.network-timeout.ts
│       ├── bug.assertion.ts
│       ├── script.selector-not-found.ts
│       └── other.generic.ts
├── runners/                            # Evaluation logic
│   ├── types.ts                        # Runner type definitions
│   └── stored-results-analysis.ts      # LLM invocation + validation
├── datasets/                           # Generated JSON files (gitignored)
│   └── stored-results-analysis/
│       ├── smoke.json
│       └── regression.json
├── generate-datasets.ts                # Dataset generation script
├── smoke.test.ts                       # Quick validation tests
├── regression.test.ts                  # Comprehensive validation tests
├── README.md                           # This file
└── FUTURE_ENHANCEMENTS.md              # Roadmap for framework expansion
```

## Quick Start

### 1. Environment Setup

Ensure you have the required environment variable:

```bash
export OPENAI_API_KEY="sk-..."
```

### 2. Generate Datasets

```bash
npm run gen:prompt-datasets
```

This creates:
- `datasets/stored-results-analysis/smoke.json` (4 cases)
- `datasets/stored-results-analysis/regression.json` (40 cases)

### 3. Run Tests

**Smoke tests** (fast, ~1-2 minutes):
```bash
npm run test:prompts:smoke
```

**Regression tests** (comprehensive, ~3-5 minutes):
```bash
npm run test:prompts:regression
```

**Both** (generate + smoke):
```bash
npm run test:prompts
```

## How It Works

### Template Factories

Each template factory is a function that generates test case variations:

```typescript
export function infraNetworkTimeout(i: number): TestCase {
  const base = makeCaseBase(i, {
    name: "infra: connect ETIMEDOUT",
    status: i % 3 === 0 ? "flaky" : "failed",
    specKey: pick(i, ["api/health.spec.ts > ...", "api/users.spec.ts > ..."]),
    // ... more fields with variations
  });

  return {
    name: `${base.name} #${i}`,
    tags: ["infra", "network", "timeout"],
    input: { ...base.input, id: makeUuid(i) },
    expect: {
      category: "infra",
      status: base.input.status,
      errorQuality: base.input.status === "failed" ? "required" : "null",
      confidenceMin: 3,
      confidenceMax: 5,
    },
  };
}
```

### Test Case Structure

```typescript
interface TestCase {
  name: string;              // Human-readable test name
  tags?: string[];           // Categories for filtering
  input: TestInput;          // Data sent to LLM
  expect: Expectations;      // Validation rules
}
```

### Validation Rules

The runner checks:
1. **Contract**: Response length matches input length
2. **Status preservation**: LLM must not change the input status
3. **Category match**: Output category matches expected category
4. **Error quality rules**:
   - Failed tests: Must have non-null errorQuality fields
   - Flaky tests: Must have null errorQuality fields
5. **Confidence range**: Output confidence within min/max bounds
6. **Conclusion quality**: Non-empty, meaningful text (>20 chars)

## Adding New Templates

1. **Create template file** in `templates/stored-results-analysis/`:

```typescript
// templates/stored-results-analysis/performance.slow-response.ts
export function performanceSlowResponse(i: number): TestCase {
  // Implementation with pick(), makeUuid(), makeCaseBase()
}
```

2. **Export in index.ts**:

```typescript
export const templateFactories = [
  // ... existing factories
  performanceSlowResponse,
];
```

3. **Regenerate datasets**:

```bash
npm run gen:prompt-datasets
```

4. **Run tests** to validate:

```bash
npm run test:prompts:smoke
```

## Testing Different Prompt Versions

To test a different prompt version, update the import in `runners/stored-results-analysis.ts`:

```typescript
// Current: v1.1.0
import { getStoredResultsAnalysisPrompt } from "@/prompts/stored-results-analysis/v1.1.0";

// To test v1.0.0:
import { getStoredResultsAnalysisPrompt } from "@/prompts/stored-results-analysis/v1.0.0";
```

Then regenerate datasets and rerun tests.

## Troubleshooting

### Tests Failing with "Missing output for id=..."

The LLM didn't return analysis for all input test cases. Check:
- OPENAI_API_KEY is set correctly
- No rate limiting issues
- Prompt contract is clear about expected output length

### Category/Confidence Mismatches

The LLM categorized differently than expected. This may indicate:
- Template expectations are too strict
- Prompt needs improvement
- Test case is ambiguous

Review the specific test case and adjust either the template or the prompt.

### Timeout Errors

Increase Jest timeout in test files:

```typescript
jest.setTimeout(300_000); // 5 minutes
```

## Cost Considerations

Approximate costs per run (gpt-4.1-mini):
- Smoke tests (4 cases): ~$0.001-0.002
- Regression tests (40 cases): ~$0.01-0.02

Monitor token usage in LangSmith if tracing is enabled.

## Related Documentation

- [FUTURE_ENHANCEMENTS.md](./FUTURE_ENHANCEMENTS.md) - Planned features
- [Prompt versioning](../src/prompts/stored-results-analysis/) - Prompt implementations
- [Test analysis schemas](../src/schemas/testAnalysisSchemas.ts) - Zod validation schemas
