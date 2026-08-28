## Why

Issue and Result categories answer different questions and must not overwrite one
another. `Issue.category` is the persisted, user-selected classification used to
display an Issue or Hypothesis. Result analysis remains an analytics record:
AI writes `Result.analysisCategory`; human review writes
`Result.analysisFeedbackCategory`; and the effective Result category is
`analysisFeedbackCategory ?? analysisCategory`.

## What Changes

- Retain `Issue.category` as required persisted state. Valid persisted values are
  lowercase `bug`, `infra`, `performance`, `script`, and `other`.
- Keep `Issue.category` as the canonical category for Issue/Hypothesis display,
  Issue create/update, and Issue `category` filtering. There is no migration to
  drop the column or its index.
- Keep effective Result category as the canonical source for Result exports,
  Result statistics, and Dashboard category analytics. Feedback overrides AI
  analysis for those Result-based surfaces.
- Include `categorySummary` on Issue read and statistics surfaces. Its
  `displayCategory` is the persisted Issue category; its distribution and
  `isMixed` describe distinct linked Results across all assumptions.
- Document the atomic Assign Issue modal create-and-assign and confirmed-edit
  workflows, plus the intentionally narrower generic assumption operations.

## Impact

- Affected OpenSpec capability: `analysis-category-source-of-truth`.
- Affected contracts: authenticated Issue REST/OpenAPI, the exposed MCP Issue
  tools, Result analysis feedback, and Assign Issue modal REST operations.
- Affected client material: MCP reference and Postman Issue collection and
  generated guides.
