## Context

The stored results analysis flow currently builds a normalized `essentialData` array from failed or flaky results and sends it to the model as `JSON.stringify(essentialData)` alongside the stored-results-analysis system prompt. The existing prompt evaluation framework under `__prompts-tests__/stored-results-analysis` already mirrors this shape and validates analysis quality expectations.

The immediate problem is high token usage in LangSmith traces for failed-result analysis payloads. This change evaluates whether TONL payload encoding is a low-risk token reduction step before deeper transformations such as compressing `errorMessage` and `errorStack`.

## Goals / Non-Goals

**Goals:**

- Add a repeatable prompt evaluation suite that runs the same realistic failed-result fixtures through raw JSON and TONL payload formats.
- Preserve the current production JSON behavior as the baseline.
- Trace each variant in LangSmith with metadata that makes token/cost comparison easy.
- Validate analysis quality for each variant using the same expectations already used by stored-results-analysis prompt tests.
- Produce a local comparison summary for quick review after a test run.

**Non-Goals:**

- Do not change production payload encoding.
- Do not change the production analysis service, REST API, MCP tools, database schema, or response schema.
- Do not change provider/model selection as part of this experiment.
- Do not compress, summarize, redact, or otherwise transform `errorMessage` or `errorStack` beyond representing the same content in TONL.
- Do not make TONL integration decisions automatically; the suite provides evidence for a later decision.

## Decisions

### Use prompt tests rather than production code

The comparison will live under `__prompts-tests__/stored-results-analysis` because it is an evaluation tool, not a runtime behavior change. This keeps production risk near zero and lets the team run the experiment when LangSmith/OpenAI credentials are available.

Alternative considered: add payload encoding options to `testAnalysisService`. That would couple an experiment to production code before the data proves TONL is worthwhile.

### Use normalized failed-result fixtures

Fixtures will use the normalized `TestInput` shape consumed by the stored-results-analysis prompt runner. They should be derived from realistic upload/analysis failures and cover different failure types such as assertion mismatch, URL timeout, setup/API failure, selector/script failure, and ambiguous generic failure.

Alternative considered: derive fixtures directly from raw Playwright report files during the test. That is more end-to-end, but it mixes report ingestion concerns into a payload encoding experiment and makes failures harder to interpret.

### Compare the same semantic payload across encoders

The baseline encoder will be the current raw JSON payload. TONL variants must preserve the same field values and omit only JSON syntax overhead. If a compact TONL variant uses shorter labels, it must still remain self-describing enough for the prompt to understand the payload.

Alternative considered: immediately compress `errorMessage` and `errorStack`. That may produce larger savings, but it changes the semantic input and should be evaluated after the encoding-only baseline.

### Give TONL a fair prompt instruction

TONL runs need test-only prompt wording that tells the model the user payload is TONL while keeping the task, schema, and quality requirements equivalent to the JSON baseline. Without this, a quality drop could reflect input-format confusion rather than TONL suitability.

Alternative considered: reuse the current prompt verbatim. The current prompt documents JSON input, so that would bias the experiment against TONL.

### Use LangSmith traces as the source for cost/token observability

The suite will tag or name runs with encoder, fixture set, model, prompt version, and change identifier so LangSmith can be used to compare prompt tokens, completion tokens, total tokens, and cost. Local output should summarize available metrics but not replace LangSmith for trace inspection.

Alternative considered: only use local token counting. Local counting is useful for deterministic payload comparisons, but provider traces are the actual source of billing/cost truth.

## Risks / Trade-offs

- TONL saves syntax tokens but stack traces dominate payload size -> Report payload-only and full-prompt deltas separately, so the team can see whether encoding is enough before deeper compression.
- TONL quality differs because the prompt still references JSON examples -> Add test-only TONL input-format instruction while preserving task and output schema.
- LangSmith token/cost metrics may require credentials and tracing environment variables -> Keep the suite runnable only in prompt-test contexts and document required environment setup in the test output or README.
- Fixtures drift from production payload shape -> Reuse the existing `TestInput` type and keep fixture field names aligned with `testAnalysisService` essential data.
- Trace metadata becomes hard to filter -> Standardize metadata keys such as `encoder`, `fixtureSet`, `promptVersion`, `model`, and `change`.
