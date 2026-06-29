## Context

The backend currently stores failure category in two places with different meanings: `Issue.category` and `Result.analysisCategory`. Result analysis already has a feedback path through `Result.analysisFeedbackCategory`, `analysisReviewedAt`, and `analysisReviewedById`, and analysis export already derives final category as `analysisFeedbackCategory ?? analysisCategory`.

Issues are connected to results indirectly through `Issue -> Assumption -> ResultError -> Result`. Because of that indirection, a persisted `Issue.category` can drift from the results linked to the issue, and deleting an issue removes the issue-owned category while result analysis history remains. The backend should make result analysis the categorization authority and treat issue category display as a derived summary.

## Goals / Non-Goals

**Goals:**

- Remove `Issue.category` as persisted state and from issue write contracts.
- Preserve AI analysis category in `Result.analysisCategory`.
- Preserve user category corrections in `Result.analysisFeedbackCategory` with reviewer metadata.
- Derive each result's effective category as `analysisFeedbackCategory ?? analysisCategory`.
- Derive issue category display from the effective categories of linked results.
- Expose mixed-category state for issues whose linked results do not share a single effective category.
- Keep REST, MCP, OpenAPI, TypeScript types, Prisma schema, and tests aligned.

**Non-Goals:**

- Do not change the supported category values: `bug`, `infra`, `performance`, `script`, and `other`.
- Do not overwrite AI analysis fields when a human provides feedback.
- Do not introduce persisted issue labels, tags, or workflow classifications as part of this change.
- Do not change project category weights.
- Do not change how assumptions link issues to result errors, except where query includes are needed for derived summaries.

## Decisions

### Result Effective Category

Use `analysisFeedbackCategory ?? analysisCategory` as the effective category wherever a user-facing category needs to reflect human review.

Alternatives considered:

- Overwrite `analysisCategory` when users correct category. This loses AI output and makes audits/model-quality comparisons harder.
- Add a new persisted `finalCategory`. This duplicates state that can be derived and introduces another synchronization point.

### Issue Category Summary

Issue responses that need category display should expose a derived `categorySummary` instead of `category`.

Suggested response shape:

```ts
categorySummary: {
  displayCategory: "bug" | "infra" | "performance" | "script" | "other" | null;
  isMixed: boolean;
  distribution: {
    bug: number;
    infra: number;
    performance: number;
    script: number;
    other: number;
  };
  uncategorizedCount: number;
}
```

Rules:

- Ignore linked results with no effective category when calculating `displayCategory`.
- If there are no linked categorized results, return `displayCategory: null`, `isMixed: false`, and zero distribution counts.
- If all linked categorized results share one effective category, return that category and `isMixed: false`.
- If one category has the highest count but other categories are present, return that category and `isMixed: true`.
- If multiple categories tie for highest count, return `displayCategory: null` and `isMixed: true`.
- Track linked results without effective category separately as `uncategorizedCount`.

Alternatives considered:

- Persist a single dominant category on `Issue`. This recreates the two-source problem and can become stale after result feedback changes.
- Return only `Mixed` as a pseudo-category. This pollutes the category enum with a value that is not a failure category.
- Return only distribution without `displayCategory`. This is clean but pushes common display logic into every client.

### Issue Category Filtering

Remove issue filtering by persisted `Issue.category`. If category filtering is still needed for issue lists, it should be explicitly defined as filtering by linked result effective category and implemented as a derived query.

Initial implementation should prefer contract clarity over preserving a misleading query parameter. Existing clients using issue category filters will need to migrate to result filtering or to a newly documented derived issue-category filter if product requires it.

Alternatives considered:

- Keep the same `category` query parameter and silently reinterpret it. This minimizes client changes but makes the API contract easy to misunderstand.
- Add a new `effectiveCategory` query parameter immediately. This is viable if the UI needs issue-list category filtering in the same release, but it adds query complexity and should be explicitly tested.

### Statistics

Result stats and issue stats should derive issue category information from linked results. Existing `topIssues[].category` should either be replaced by `categorySummary` or by explicit derived fields such as `displayCategory`, `isMixed`, and `distribution`.

## Risks / Trade-offs

- **Breaking API clients that send or read issue category** -> Document the contract removal in OpenAPI/MCP, update tests, and provide a clear migration path to result feedback fields.
- **Derived category queries may be more expensive than reading `Issue.category`** -> Compute summaries only in endpoints that need them, include only necessary result analysis fields, and add focused tests around query shape/performance-sensitive paths.
- **Mixed category display can surprise users expecting one label** -> Expose `isMixed` and distribution so clients can render the ambiguity intentionally.
- **Historical issue category values will be dropped** -> Treat existing issue categories as non-authoritative. If preservation is required, export before migration or map manually to result feedback in a separate migration, but do not auto-copy issue category to results because there is no reliable one-to-one relationship.

## Migration Plan

1. Add a Prisma migration that drops the `Issue.category` column and the `Issue_projectId_category_idx` index.
2. Update generated Prisma types after the schema change.
3. Remove issue category from create/update inputs, serializers, OpenAPI schemas, MCP schemas, and TypeScript interfaces.
4. Update issue list/detail/stats logic to compute `categorySummary` from linked result effective categories where category display is required.
5. Update result stats `topIssues` contract to use derived category summary fields instead of `issue.category`.
6. Update tests for issue create/update/list/stats, MCP schemas, OpenAPI contracts, and result statistics.

Rollback strategy: restore the dropped column/index in a rollback migration if needed. Rollback cannot reconstruct previously dropped historical issue category values unless they were backed up before deployment.

## Open Questions

- Should issue list endpoints continue supporting category filtering via a new derived filter such as `effectiveCategory`, or should category filtering move entirely to result/reporting views?
- Should `categorySummary` appear on every issue response, or only stats/list responses where the client displays issue category?
