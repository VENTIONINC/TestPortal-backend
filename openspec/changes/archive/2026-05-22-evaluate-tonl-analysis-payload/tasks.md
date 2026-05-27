## 1. Fixtures

- [ ] 1.1 Add realistic stored-results-analysis comparison fixtures using the normalized `TestInput` shape.
- [ ] 1.2 Cover several failed/flaky failure classes, including assertion mismatch, timeout/navigation failure, setup/API failure, script/selector failure, and ambiguous/generic failure where available.
- [ ] 1.3 Document fixture provenance enough to show they are derived from realistic upload/analysis failures without requiring raw report ingestion in the comparison suite.

## 2. Payload Encoders

- [ ] 2.1 Add a raw JSON encoder that matches the current `JSON.stringify(cases.map((c) => c.input))` baseline.
- [ ] 2.2 Add a TONL encoder that preserves the same field values as the JSON baseline, including full `errorMessage` and `errorStack` content.
- [ ] 2.3 Add encoder metadata describing format name, prompt input instructions, and whether the variant is encoding-only.
- [ ] 2.4 Add local token-count helpers for payload-only and full prompt counts using the model tokenizer available in the project dependency graph.

## 3. Evaluation Runner

- [ ] 3.1 Extend or add a stored-results-analysis comparison runner that executes each encoder over the same fixture set.
- [ ] 3.2 Add test-only TONL prompt input instructions while preserving the stored-results-analysis task, output schema, and quality expectations.
- [ ] 3.3 Validate output quality for every encoder using status, category, confidence, conclusion, and error-quality expectations.
- [ ] 3.4 Attach LangSmith metadata to each model invocation, including `change`, `encoder`, `fixtureSet`, `promptVersion`, and `model`.

## 4. Reporting

- [ ] 4.1 Print a local comparison summary showing quality pass/fail status per encoder and fixture.
- [ ] 4.2 Print JSON vs TONL token counts, absolute deltas, and percentage savings for payload-only and full-prompt measurements.
- [ ] 4.3 Include trace-identifying information or metadata guidance so LangSmith token/cost comparison is easy after the run.

## 5. Scripts and Verification

- [ ] 5.1 Add an npm script for running the TONL payload comparison suite separately from normal unit tests.
- [ ] 5.2 Run the comparison suite with required OpenAI/LangSmith environment variables and inspect traces for encoder metadata.
- [ ] 5.3 Run `npm run type-check` and the relevant prompt/test command to verify the test-only implementation.
