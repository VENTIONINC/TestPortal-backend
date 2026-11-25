# Error similarity: legacy vs Jev

Run the live comparison (requires `TYPESAFE_API_KEY` in the environment or `.env`):

```bash
npx jest --config jest.prompts.config.ts --selectProjects error-similarity-typesafe --runInBand
```

Optional settings: `ERROR_SIMILARITY_MODEL` (default `jev-1.13.0`) and
`ERROR_SIMILARITY_THRESHOLD` (default `0.8`, experimental, not calibrated).
This command sends 37 synthetic error pairs to TypeSafe and consumes API tokens.
It does not access the database or change production behavior.

The shared fixtures in `__tests__/fixtures/errorSimilarity.ts` are also exercised by:

```bash
npm test -- --runInBand __tests__/lib/error-analyzer.test.ts
```

The comparison executes the real `runReview` against mocked Prisma responses,
then asks Jev to judge each pair using the same message, type, call log, and stack.
Jev sees original message text and normalized JSON trace arrays, without labels,
legacy decisions, issue descriptions, or candidate IDs. It does not inherit the
legacy message-length gate, allowing its effect to be observed.

Reports are saved to ignored `reports/comparison-<timestamp>.json` files. They
include model, question, threshold, per-case decisions, probabilities, latency,
API errors, token usage, accuracy, precision, recall, false positives and false negatives on labeled successful cases. API failures
remain null predictions and are counted separately. Legacy scores are null when
no suggestion was created; they are not a computed zero. Legacy timings use mocked
DB operations, so they are not production latency measurements. No price is
assumed; token totals are provided instead.

`expectedMatch` means enough evidence to *suggest* a shared failure, not a proven
common root cause. Labels are provisional expectations for synthetic examples.
Placeholder/length-only examples have null labels and are excluded from accuracy.
The HTTP status example is intentionally contradictory. These synthetic
pairs cannot establish production quality or calibrate a threshold.

This is an exploratory evaluation: quality disagreements are reported, not Jest
failures. API/contract failures and legacy baseline drift fail the run. Unit tests
for assumption selection, database failures, ordering, and project filtering are
workflow checks, not questions for Jev; they remain in the original unit suite.
A future benchmark should add independently labeled real error pairs, negative
cases, multi-candidate ranking, and temporal train/evaluation separation.

The expanded set includes 28 additional cases: paraphrased network/TLS/auth
failures, changed identifiers and stack paths, long wrappers, missing traces,
contradictory assertions/status codes/SQLSTATEs, unrelated selectors, distinct
causes behind identical timeouts, and generic errors with insufficient evidence.
Semantic labels were set before querying Jev; legacyMatch records observed legacy
behavior and is deliberately separate from expectedMatch. Prompt and threshold
remain unchanged from the initial experiment.
