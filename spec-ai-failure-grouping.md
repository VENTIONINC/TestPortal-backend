---
title: "PRD: AI Failure Grouping"
status: Draft
date: 2026-03-06
version: "1.0"
product: Test Portal
tags: [PRD, AI, grouping, automation, feature-spec]
---

# PRD: AI Failure Grouping

> [!info] Context
> An automation engineer looks at 20+ failures in one execution and manually figures out which ones are related. `error-analyzer.ts` already performs text-based similarity matching, but it does not understand semantics. `testAnalysisService` has already produced an `analysisDescription` for each failure, which is a distilled signal ready for a second pass. The idea is to take failure descriptions from one category, cluster them with an LLM, and return suggested Assumptions.

---

## 1. Problem Statement

After every execution with failures, the automation engineer does the same work: open each error, read it, and decide whether it is a new bug or the same problem as before. If several failures are related, they manually create an Assumption and link it to an Issue.

With 5 failures this is tolerable. With 30, it becomes 20 minutes of mechanical triage before any actual fixing even starts.

`error-analyzer.ts` tries to help through string similarity, but it only works when stack traces are textually similar. Two tests can fail for the same reason, for example both because of an expired auth token, but in completely different code paths with different messages. The current algorithm will not connect them.

AI can do this because it already has `analysisDescription`: a short semantic explanation for each failure that `testAnalysisService` generated during ingest. A second pass over these descriptions is cheap and works on meaning rather than raw text.

---

## 2. Goals

- The automation engineer gets ready-made failure groups with one suggested root cause instead of sorting manually.
- Suggested Assumptions are created automatically and wait for confirmation, so the existing workflow stays the same but is pre-filled.
- The second LLM call works on already distilled data rather than raw stack traces, which keeps cost and token usage predictable.

---

## 3. Non-Goals

| # | What we are not doing | Why |
|---|------------------------|-----|
| 1 | Automatically confirm Assumptions | The automation engineer must verify them because they have context the AI does not |
| 2 | Group all categories at once | Start with one category at a time, usually Bug. Environment failures are often all the same root cause and do not need grouping |
| 3 | Run automatically after every ingest | This is on-demand. Not every execution needs grouping, and the LLM cost should not be mandatory |
| 4 | Create new Issues | Only link to existing ones. Creating an Issue remains a human decision |
| 5 | Work without existing `analysisDescription` | If `testAnalysisService` has not run, the feature is unavailable for that execution |

---

## 4. How It Works

### Input Data

For a given `executionId` and `category`, for example `Bug`:

```text
ResultError_1: { analysisDescription: "Auth token expired before test completed, login step returned 401" }
ResultError_2: { analysisDescription: "Database connection reset during query, likely connection pool exhausted" }
ResultError_3: { analysisDescription: "Auth service returned 401, token validation failed in middleware" }
ResultError_4: { analysisDescription: "Timeout waiting for element on checkout page, likely slow render" }
ResultError_5: { analysisDescription: "JWT validation rejected token, auth header missing in downstream call" }
```

### What the Algorithm Does (First Pass)

`error-analyzer.ts` quickly runs similarity matching over `message` and `callStack` and produces draft candidate clusters based on textual similarity. This is a filter, not the final answer.

### What the LLM Does (Second Pass)

Take all `analysisDescription` values for the category plus the draft algorithmic clusters. The LLM:

1. Confirms or revises the algorithmic groups
2. Catches semantically similar failures that the algorithm separated, for example #1, #3, and #5 above, which are all about auth
3. Writes a short `groupDescription` for each group, for example: `Auth token expiry - 3 failures, likely same root cause`

### Output Data

```json
{
  "groups": [
    {
      "groupDescription": "Auth token expiry - JWT validation failing across multiple tests",
      "confidence": 0.91,
      "resultErrorIds": ["err_1", "err_3", "err_5"],
      "suggestedIssueQuery": "auth token"
    },
    {
      "groupDescription": "Database connection pool exhausted",
      "confidence": 0.85,
      "resultErrorIds": ["err_2"]
    },
    {
      "groupDescription": "UI render timeout on checkout",
      "confidence": 0.78,
      "resultErrorIds": ["err_4"]
    }
  ]
}
```

Each group maps to `suggestedAssumptions[]` for the errors inside it. If the user accepts the group, `Assumption` records are created in the database through the existing flow.

---

## 5. Requirements

### P0 — Must Have

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| P0-1 | **POST /api/v2/executions/:id/group-failures** | Accepts `{ category: "Bug" }`. Returns an array of groups with `groupDescription`, `confidence`, and `resultErrorIds`. Requires all ResultErrors in the category to have `analysisDescription`. |
| P0-2 | **Hybrid pipeline** | First run `error-analyzer.ts` to produce text-based candidate clusters. Then run an LLM pass on `analysisDescription` using those clusters as hints. The LLM can merge and split clusters. |
| P0-3 | **Prompts use `analysisDescription`, not raw stack traces** | The LLM request includes only `resultErrorId` and `analysisDescription`. Stack traces are not sent. This keeps token usage predictable. |
| P0-4 | **Graceful degradation** | If the LLM is unavailable or times out after 8 seconds, return algorithmic clusters from `error-analyzer.ts` with `source: "algorithmic"`. The endpoint must never return 500 because of AI. |
| P0-5 | **Guard: at least 2 errors in the category** | If the category has fewer than 2 ResultErrors, return `{ groups: [], reason: "insufficient_failures" }`. Grouping a single failure is not useful. |
| P0-6 | **Guard: `analysisDescription` must exist** | If at least 50% of ResultErrors are missing `analysisDescription`, return `{ groups: [], reason: "analysis_not_complete" }`. Wait until `testAnalysisService` has completed. |
| P0-7 | **Result is not persisted** | Grouping is a suggestion at request time, not stored state. The user decides whether to accept it. |
| P0-8 | **Accepting a group creates Assumptions** | `POST /api/v2/executions/:id/group-failures/accept` accepts `{ groupResultErrorIds: [...], issueId }` and creates Assumptions through the existing `assumptionService`. |

### P1 — Nice to Have

| ID | Requirement | Description |
|----|-------------|-------------|
| P1-1 | **`suggestedIssueQuery` in the response** | The LLM generates a short search query for each group so the UI can prefill issue search when the user chooses what to link. |
| P1-2 | **Grouping across multiple categories** | Support `categories: ["Bug", "Script"]` instead of a single category so the LLM can see broader context. |
| P1-3 | **MCP tool: `group-execution-failures`** | AI agents can trigger grouping programmatically and then immediately confirm Assumptions. |
| P1-4 | **Cache the result** | Keep the latest grouping result for an execution in Redis or in-memory for 10 minutes so repeat requests do not spend LLM tokens again. |

### P2 — Future

- Automatically trigger grouping after ingest if the number of Bug failures is greater than N, with a configurable threshold.
- Feedback loop: if the automation engineer regularly splits groups that the LLM merged, reflect that in the prompt.
- Issue integration: if a group's `suggestedIssueQuery` exactly matches an existing Issue, propose that specific Issue instead of only a search query.

---

## 6. Prompt Design

```text
You are analyzing test failures. You are given AI-processed error descriptions
from one test execution. Group them by likely shared root cause.

Errors:
{{#each errors}}
[{{id}}] {{analysisDescription}}
{{/each}}

Draft groups from the similarity algorithm, use as a hint, not as a rule:
{{algorithmicClusters}}

Return JSON strictly in this format:
{
  "groups": [
    {
      "resultErrorIds": ["id1", "id2"],
      "groupDescription": "short description of the shared cause, one sentence",
      "confidence": 0.0-1.0,
      "suggestedIssueQuery": "2-3 words for searching issues"
    }
  ]
}

Rules:
- Every id must appear in exactly one group
- Single unmatched errors must still be included as one-item groups
- confidence reflects confidence that the failures share one root cause, not the quality of the description
- suggestedIssueQuery should use the same language as the original descriptions
```

> [!note] Structured output via LangChain
> Use the same pattern as `testAnalysisService`: LangChain structured output with a Zod schema. This guarantees valid JSON without post-processing.

---

## 7. Files

```text
src/services/
  failureGroupingService.ts       CREATE  orchestration: error-analyzer -> LLM -> merge

src/prompts/
  failure-grouping.ts             CREATE  prompt + Zod output schema

src/controllers/
  executionController.ts          MODIFY  add groupFailures(), acceptGroup()

src/routes/
  executionRoutes.ts              MODIFY  POST /:id/group-failures, POST /:id/group-failures/accept

src/lib/openapi/
  executionGrouping.ts            CREATE  OpenAPI schemas

src/mcp/tools/
  executions.ts                   MODIFY  add group-execution-failures (P1)

__tests__/services/
  failureGroupingService.test.ts  CREATE  guards, graceful degradation, merge logic
```

---

## 8. Open Questions

| # | Question | Blocks implementation? |
|---|----------|------------------------|
| OQ-1 | Should `errorQualityScore` be passed into the prompt as an extra signal? A poorly described error can lead to inaccurate grouping, and the LLM could take that into account. | No |
| OQ-2 | How many ResultErrors should be allowed in one LLM request at most? With 100+ failures we likely need batching or pre-filtering. | Yes, before implementation |
| OQ-3 | Should grouping usage be logged in LangSmith, similar to `testAnalysisService`, so quality can be evaluated over time? | No |

---

> *The gap is confirmed in `reports/report.md` ("most frequently failing test cases") and in the architecture of `error-analyzer.ts`: algorithmic similarity does not cover semantics.*
