## Context

The runtime stores two intentionally scoped category values:

- `Issue.category` is required persisted Issue state. It is the canonical value
  for Issue and Hypothesis display.
- `Result.analysisCategory` is AI analysis; `Result.analysisFeedbackCategory` is
  a human correction with review metadata. The effective Result category is
  `analysisFeedbackCategory ?? analysisCategory`, normalized for Result and
  Dashboard analytics.

The supported persisted Issue values and write-contract values are lowercase:
`bug`, `infra`, `performance`, `script`, and `other`. The runtime does not
introduce a migration that drops `Issue.category` or its category index.

## Issue Reads And Category Summary

Issue list, detail, and with-statistics reads retain the Issue's `category` and
also return:

```ts
categorySummary: {
  displayCategory: Issue.category;
  isMixed: boolean;
  distribution: { bug: number; infra: number; performance: number; script: number; other: number };
  uncategorizedCount: number;
}
```

`displayCategory` is always the persisted Issue category; it is not inferred
from Result analysis. The summary traverses every assumption linked through
`Issue -> Assumption -> ResultError -> Result`, including confirmed and
unconfirmed assumptions. It deduplicates by `(issueId, resultId)`, so multiple
errors or assumptions that lead to the same Result count once for that Issue.

For each distinct linked Result, analytics use
`analysisFeedbackCategory ?? analysisCategory`. Values are trimmed and compared
case-insensitively; legacy `environment` normalizes to `infra`; missing, empty,
or unsupported values increment `uncategorizedCount` rather than `other`.
`isMixed` is true exactly when at least two supported categories have a positive
count. Uncategorized Results alone do not make an Issue mixed.

Issue list and detail use all linked Results. For `GET /api/v2/issues/with-stats`,
the existing `statFrom`, `statTo`, and optional execution `type` scope the same
distinct Result set used by occurrence statistics and `categorySummary`.
The `category` query parameter continues to filter persisted `Issue.category`.

## Result And Dashboard Analytics

Result statistics, result exports, and Dashboard category metrics are Result
analytics, not Issue display. They use the effective Result category. Dashboard
maps canonical `infra` into its existing `issuesEnvironment` bucket. Result
statistics retain an Issue's persisted `category` as well as `categorySummary`
on each top Issue; the summary is descriptive analytics and does not replace the
Issue category.

## Assign Issue Modal And Assumption Workflows

The modal APIs are authenticated and project-scoped through their request body
or query:

- `POST /api/v2/result-errors/{resultErrorId}/issue` atomically creates an Issue
  with a required lowercase category, creates a confirmed user assumption for
  the target ResultError, sets that containing Result's feedback category and
  reviewer metadata, and refreshes the affected Dashboard bucket. It refuses a
  target that already has a confirmed assumption.
- `PATCH /api/v2/result-errors/{resultErrorId}/issue` atomically updates the
  target's confirmed Issue and the containing Result's feedback category, then
  refreshes the affected Dashboard bucket. It requires exactly one confirmed
  project-scoped assumption for that ResultError.
- Generic assumption creation only creates the requested relationship and
  assumption data. It does not copy an Issue category to a Result.
- Confirming an existing assumption through the generic assumption update
  operation synchronizes its linked Issue category to that Result's feedback
  category, stores reviewer metadata, and refreshes the Dashboard bucket.
- Unassigning/rejecting an assumption (`isConfirmed: false`) deletes that
  assumption but deliberately preserves any already stored Result feedback.

Editing an Issue through ordinary Issue update or the confirmed modal edit does
not cascade to every historical Result linked to that Issue. The confirmed modal
edit synchronizes only its containing Result; other history stays unchanged.

## MCP Scope

The exposed MCP Issue tools are `get-issues`, `get-issue-by-id`, and
`create-issue`. They accept or return the persisted Issue category as applicable;
`get-issues` supports persisted `category` filtering. The atomic modal workflow
is REST-only in the current MCP registration and must not be presented as an MCP
tool.
