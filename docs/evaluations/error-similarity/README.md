# Error similarity: legacy vs Jev

Historical baseline for `enable-jev-error-similarity`, recorded on 2026-09-20.
These are actual API results, not projected production accuracy.

## Conditions

- Model: `jev-1.13.0`; Jev threshold: **0.8**. Prompt and threshold unchanged between runs.
- Legacy: real `runReview` with mocked Prisma, original 0.7 threshold and length gate.
- Jev input: type, original message, normalized callLog and callStack. Labels and legacy decisions are not sent to the model.
- One pair per request. A positive label means sufficient evidence to suggest a shared failure, not proof of a common root cause.
- Synthetic fixtures, deliberately including challenges for string matching. Labels were defined before calling Jev. Three mechanics-only cases have null labels and are excluded from accuracy.
- API test success means a valid response; quality disagreements are reported separately.

## Results

| Metric | Initial run | Expanded run |
|---|---:|---:|
| Pairs | 9 | 37 |
| Labeled pairs | 6 | 34 |
| Legacy correct | 4/6 (66.7%) | 15/34 (44.1%) |
| Jev correct | 6/6 (100%) | 31/34 (91.2%) |
| API errors | 0 | 0 |
| Input tokens | 4564 | 19154 |
| Output tokens | 207 | 851 |

The expanded labeled set contains 17 positive and 17 negative pairs.

| Expanded metric | Legacy | Jev |
|---|---:|---:|
| True positives | 10 | 16 |
| True negatives | 5 | 15 |
| False positives | 12 | 2 |
| False negatives | 7 | 1 |
| Precision | 45.5% | 88.9% |
| Recall | 58.8% | 94.1% |

## Jev failures

- `generic-timeout-no-evidence`: false positive on a generic timeout without diagnostic evidence.
- `generic-error-shared-runner-only`: false positive on `Test failed` with a shared runner stack.
- `selector-line-number-change`: false negative after timeout and line numbers changed; probability 0.79 fell below the 0.8 threshold.

The threshold was not changed after observing these results. Placeholder cases also produced questionable matches, but have no semantic labels and do not contribute to the metrics.

## Preserved artifacts

- [Initial report: 9 pairs](initial-9-cases.json)
- [Expanded report: 37 pairs](expanded-37-cases.json)
- [Frozen inputs and labels: 37 pairs](fixtures-37-cases.json)

Reports are exact copies of the successful runs. They include UTC timestamps,
model, full question, threshold, each prediction, latency and token usage.
The first nine frozen fixtures correspond to the initial run. An unsuccessful
sandbox DNS attempt is excluded from these successful-run results.

Initial request latency was approximately 0.28–0.96 seconds. Full per-request
timings are in both reports. These include network overhead. Legacy timings use
mocked database operations and must not be interpreted as production latency.
No currency cost was calculated.

## Development use

Keep these artifacts as a historical snapshot. Save future runs separately,
recording any changes to model, prompt, threshold or dataset. The synthetic
results do not establish production accuracy; use independent, anonymized real
errors to validate changes after tuning.

Run the current comparison from the repository root with `TYPESAFE_API_KEY`:

```bash
npx jest --config jest.prompts.config.ts --selectProjects error-similarity-typesafe --runInBand
```

This consumes API tokens. New reports go to the ignored
`__prompts-tests__/error-similarity/reports` directory. Tests may evolve; the
frozen input JSON above preserves the original evaluation data independently.
