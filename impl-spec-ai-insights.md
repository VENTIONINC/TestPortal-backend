# Implementation Specification: AI-Generated Insights in PDF Export

**Author:** Igor Mikailov
**Date:** 2026-02-27
**Status:** Ready for Development
**Related ADR:** ADR-002 — AI Insights LLM Integration Approach
**Related PRD:** spec-ai-insights-pdf.md
**Dependency:** PDF export (ADR-001, impl-spec-pdf-export.md) must be live first

---

## 1. Overview

This spec covers the implementation of AI-generated insights injected into the PDF export. It is additive — the existing export pipeline (reportService, chartRenderer, pdfBuilder) is extended, not replaced. No new API endpoints are required.

Insights are **opt-in** via an `includeAiInsights` flag in the request body. If the flag is false or absent, no AI call is made and the PDF is identical to a standard export. When the flag is true, the AI call runs in parallel with chart rendering. If it fails for any reason, the PDF is still delivered with a fallback message.

> **Stack:** GPT-4.1-mini (OpenAI) · Prompt input: aggregated stats + pre-computed anomaly flags · Timeout: 8 s · Monitoring: LangSmith

---

## 2. API Changes

No new endpoint. The existing `POST /api/reports/pdf-export` absorbs the AI call transparently.

| Property | Detail |
|----------|--------|
| Endpoint | `POST /api/reports/pdf-export` (unchanged) |
| Trigger | AI insights generated only when `includeAiInsights: true` is in the request body. If absent or false, no AI call is made. |
| New request field | `includeAiInsights: boolean` (optional, default: `false`) |
| New response fields | None. Insights text is embedded in the PDF stream when opted in. |
| AI provider | OpenAI — GPT-4.1-mini |
| AI call timeout | 8 seconds. `AbortController` used to enforce. |
| Fallback on error | Static text in PDF: `"AI insights unavailable for this export."` Only relevant when `includeAiInsights: true`. |

### Request body example

```json
{
  "project": "payments",
  "environment": "staging",
  "executionType": "nightly",
  "periodStart": "2026-01-01",
  "periodEnd": "2026-01-31",
  "granularity": "daily",
  "includeAiInsights": true
}
```

---

## 3. Files to Create / Modify

| File | Change |
|------|--------|
| `src/services/reportService.js` | **MODIFY** — check `includeAiInsights` flag. If `true`, add `insightsService.generateInsights()` to `Promise.all`. If `false`, skip entirely and pass `null` to pdfBuilder. |
| `src/services/insightsService.js` | **NEW** — orchestrates AI call: computes anomaly flags, builds prompt, calls OpenAI, enforces timeout, returns text or fallback string. |
| `src/services/anomalyDetector.js` | **NEW** — pure function. Accepts bucketed metric data, returns anomaly flags (buckets deviating >30% from period average). No I/O. |
| `src/prompts/insights.js` | **NEW** — exports `buildInsightsPrompt(aggregatedStats)`. Versioned in source control for easy iteration. |
| `src/services/pdfBuilder.js` | **MODIFY** — accept `insightsText: string \| null`. Render "AI Insights" section only when `insightsText !== null`. |
| `src/config/openai.js` | **NEW or MODIFY** — ensure OpenAI client is initialised once and reused. Add `OPENAI_API_KEY` to `.env.example`. |
| `src/middleware/validateExportParams.js` | **MODIFY** — accept optional `includeAiInsights` boolean. Coerce to `false` if absent. No further validation needed. |

---

## 4. Service Responsibilities

### 4.1 `insightsService.js` — Orchestrator (NEW)

| Aspect | Detail |
|--------|--------|
| Input | `filters`, `metrics` (KPIs, failure breakdown), computes `anomalyFlags` internally |
| Step 1 | Call `anomalyDetector.detect(buckets)` → array of anomaly flags |
| Step 2 | Call `buildInsightsPrompt(aggregatedStats)` → string prompt |
| Step 3 | Call OpenAI chat completions with 8 s `AbortController` timeout |
| On success | Return insights text (string, ≤300 words per prompt instruction) |
| On failure | Catch any error (timeout, 5xx, rate limit) — log server-side, return fallback string: `"AI insights unavailable for this export."` |
| Output | `string` — either AI-generated insights or fallback message. Caller never handles errors. |

### 4.2 `anomalyDetector.js` — Anomaly Flags (NEW)

Pure function. No I/O. Fully unit-testable.

| Aspect | Detail |
|--------|--------|
| Input | `Array<{ date, total, passed, failed, skipped }>` |
| Algorithm | 1. Compute period average for `total runs` and `pass rate`. 2. For each bucket: if `|bucket_value - average| / average > 0.30`, flag it. 3. Return flagged buckets with deviation direction and magnitude. |
| Output | `Array<AnomalyFlag>`: `{ date, metric: 'total_runs' \| 'pass_rate', direction: 'spike' \| 'drop', deviationPct: number }` |
| Edge cases | Empty array → `[]`. Single bucket → `[]`. All buckets identical → `[]`. |

### 4.3 `prompts/insights.js` — Prompt Template (NEW)

Exports a single function `buildInsightsPrompt(aggregatedStats)`. Stored as a versioned source file — prompt iteration is tracked via git history without touching service logic.

```
SYSTEM:
You are a QA analytics assistant. Analyse the following test execution data
and write a concise plain-language summary (maximum 300 words).
Rules:
- Describe the overall pass rate trend (improving / declining / stable / volatile).
- If anomaly flags are present, mention each one explicitly with its date and direction.
- If one failure category accounts for >50% of failures, call it out by name and percentage.
- Do not speculate beyond the data provided.
- Do not use markdown formatting — plain text only.

USER:
Project: {project} | Environment: {environment} | Execution Type: {executionType}
Period: {periodStart} to {periodEnd} | Granularity: {granularity}

Summary KPIs:
  Total Runs: {totalRuns}
  Failed Runs: {failedRuns}
  Pass Rate: {passRate}%

Anomalies detected:
  {anomalyFlags | 'None'}

Failure root-cause breakdown:
  Bug: {bug_count} ({bug_pct}%)
  Environment: {env_count} ({env_pct}%)
  Script: {script_count} ({script_pct}%)
  Performance: {perf_count} ({perf_pct}%)
  Other: {other_count} ({other_pct}%)
```

### 4.4 `pdfBuilder.js` — Insights Section (MODIFY)

| Aspect | Detail |
|--------|--------|
| New param | `insightsText: string \| null` — `null` means flag was false; section omitted entirely. String means flag was true — render content (or fallback message if AI failed). |
| Section position | After Summary KPIs block, before trend chart. Only rendered when `insightsText !== null`. |
| Section heading | "AI Insights" as H2, with subtitle "Generated by AI · GPT-4.1-mini" in smaller muted text. |
| Content | `insightsText` rendered as plain body paragraphs. No special formatting. |
| Fallback styling | If `insightsText` equals the fallback constant, render in italics/muted colour. |
| When flag is off | No section rendered. No heading, no placeholder. PDF looks identical to a standard export. |

### 4.5 `reportService.js` — Wiring (MODIFY)

Check the `includeAiInsights` flag before building `Promise.all`. If `false`, the AI call is replaced with `Promise.resolve(null)` — zero latency cost.

```js
const parallelTasks = [
  renderTrendChart(data, filters),
  buildKPIs(data),
  filters.includeAiInsights              // ← flag check
    ? insightsService.generateInsights(filters, data)
    : Promise.resolve(null),
];

const [chartBuffer, kpis, insightsText] = await Promise.all(parallelTasks);

return buildPDF({ chartBuffer, kpis, insightsText, filters });
// pdfBuilder renders insights section only when insightsText !== null
```

---

## 5. Error Handling

| Scenario | Handling |
|----------|----------|
| OpenAI timeout (> 8 s) | `AbortController` cancels the fetch. `insightsService` returns fallback string. PDF generation continues. |
| OpenAI HTTP 429 (rate limit) | Caught as error. Log with rate-limit label. Return fallback string. |
| OpenAI HTTP 5xx | Caught as error. Log with status code. Return fallback string. |
| Network error | Caught as error. Log. Return fallback string. |
| Empty / malformed AI response | If `response.choices` is empty or text is blank, return fallback string. Do not render empty section. |
| `anomalyDetector` throws | Should never throw (pure function), but wrap in `try/catch`. If it does, proceed with empty anomaly flags rather than failing the export. |

---

## 6. Observability

- **LangSmith tracing** enabled on the OpenAI call from day one. Captures prompt, response, latency, and token count per export.
- **Server-side log** on every AI call failure: `{ timestamp, error_type, duration_ms, project, period }`.
- No user-facing logging. No storage of AI-generated text in the database for v1.

---

## 7. Testing Requirements

### Unit tests — `anomalyDetector.js`

- Given flat dataset (all buckets equal) → returns `[]`.
- Given one bucket with +35% total runs deviation → returns one `spike` flag for that date.
- Given one bucket with -40% pass rate deviation → returns one `drop` flag.
- Given empty array → returns `[]`.
- Given single bucket → returns `[]`.

### Integration tests — `insightsService.js`

- Mock OpenAI to return valid text → service returns that text.
- Mock OpenAI to timeout after 9 s → service returns fallback string, does not throw.
- Mock OpenAI to return HTTP 500 → service returns fallback string, does not throw.

### Integration tests — `reportService.js`

- `includeAiInsights: false` → `insightsService.generateInsights` is never called.
- `includeAiInsights: true` → `insightsService.generateInsights` is called in parallel with `renderTrendChart`.

---

## 8. Acceptance Criteria

| ID | Priority | Criterion |
|----|----------|-----------|
| AC-01 | P0 | When `includeAiInsights` is `false` or absent, no AI call is made and no insights section appears in the PDF. |
| AC-02 | P0 | When `includeAiInsights: true`, PDF contains an "AI Insights" section labelled "Generated by AI" between KPIs and charts. |
| AC-03 | P0 | Insights text includes a description of the pass rate trend (improving / declining / stable / volatile). |
| AC-04 | P0 | If an anomaly flag exists, insights mention the specific date and direction (spike/drop). |
| AC-05 | P0 | If one failure category > 50% of failures, insights name it explicitly. |
| AC-06 | P0 | When `includeAiInsights: true` and OpenAI times out (> 8 s), PDF is still generated with fallback message. No HTTP 500. |
| AC-07 | P0 | When `includeAiInsights: true` and OpenAI returns HTTP 500, same fallback behaviour as AC-06. |
| AC-08 | P0 | P95 latency with `includeAiInsights: true` ≤ 10 s. P95 with `includeAiInsights: false` unchanged (≤ 5 s). |
| AC-09 | P0 | AI call runs in parallel with chart rendering when flag is true. Verified by log timestamps. |
| AC-10 | P0 | `anomalyDetector` unit tests pass: correct flags for known datasets, empty array for edge cases. |
| AC-11 | P1 | Insights section is ≤ 300 words in output PDF. |
| AC-12 | P1 | Fallback message rendered in visually distinct style (italics or muted colour). |

---

## 9. Dependencies

- `openai` — OpenAI Node SDK. Add to `package.json` if not already present.
- `OPENAI_API_KEY` — must be in environment config. Document in `.env.example`.
- `LANGSMITH_API_KEY` — for tracing. Add to `.env.example`.
- No DB schema changes. No new tables.

---

## 10. Rollout Plan

| Phase | Description |
|-------|-------------|
| Phase 1 — Core services (2–3 days) | Implement `anomalyDetector.js` (with unit tests), `insightsService.js` (with mocked OpenAI), `prompts/insights.js`. Test prompt output quality against sample datasets. |
| Phase 2 — Integration (1 day) | Wire `insightsService` into `reportService` `Promise.all`. Modify `pdfBuilder` to accept and render `insightsText`. Integrate real OpenAI call. |
| Phase 3 — QA (1–2 days) | Verify all P0 AC. Test fallback behaviour (mock timeout + 5xx). Measure P95 latency in staging. Spot-check insight quality on 5 real datasets. |
| Phase 4 — Ship | Deploy. Enable LangSmith tracing. Monitor fallback rate and latency in first week. |
| Phase 5 — P1 polish (follow-up) | Add recommendation line, threshold comparison, and fallback visual styling based on early user feedback. |
