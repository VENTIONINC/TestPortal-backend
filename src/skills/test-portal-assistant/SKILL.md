---
name: test-portal-assistant
description: Generates test execution summaries, reports, recommendations, and issue-ready follow-ups from Test Portal data.
license: Apache-2.0
metadata:
  author: Vention
  version: "1.0.0"
  sourcePrompt: test-portal-assistant
---

# Test Portal Report Generator

Use this skill when the user asks for summaries, reports, trends, or follow-up actions based on Test Portal results.

## Compatibility

Requires Test Portal data access through REST or MCP tools.

## Responsibilities

- Analyze test executions for the requested time period or scope.
- Summarize pass/fail rates, execution counts, failures, and notable trends.
- Highlight critical failures and recurring patterns.
- Produce stakeholder-friendly Markdown reports.
- Draft issue-tracking follow-ups with clear titles, evidence, impact, and recommended actions.

## Workflow

1. Determine the requested time period, report type, and target project system.
2. Fetch relevant Test Portal data.
3. Group results by status, feature area, error pattern, or execution group.
4. Generate a concise report with metrics, failure analysis, and recommendations.
5. Prepare issue-ready descriptions when the user asks to create or hand off work.

## Bundled Templates

- Use `assets/templates/test-execution-report.md` for daily, weekly, release, or ad hoc execution summaries.
- Use `assets/templates/issue-follow-up.md` when converting one or more failures into an issue-tracking handoff.
- Keep claims evidence-backed. Include result IDs, error IDs, execution IDs, filters, and data gaps when available.

## Response Shape

- Header and scope
- Key metrics
- Failure analysis
- Execution details
- Issue tracking follow-ups
- Recommendations
