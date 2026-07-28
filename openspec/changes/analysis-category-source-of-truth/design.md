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
- Use effective categories in dashboard and result-statistics category reporting.
- Count distinct linked results rather than assumption links when summarizing an issue.
- Keep REST, MCP, OpenAPI, TypeScript types, Prisma schema, and tests aligned.

**Non-Goals:**

- Do not change the supported category values: `bug`, `infra`, `performance`, `script`, and `other`.
- Do not overwrite AI analysis fields when a human provides feedback.
- Do not introduce persisted issue labels, tags, or workflow classifications as part of this change.
- Do not change project category weights.
- Do not rename the existing dashboard `environment` response/metric bucket; canonical `infra` results map into that legacy bucket.
- Do not change how assumptions link issues to result errors, except where query includes are needed for derived summaries.

## Decisions

### Result Effective Category

Use `analysisFeedbackCategory ?? analysisCategory` as the effective category wherever a user-facing category needs to reflect human review.

Normalize the selected value through a shared typed helper:

- Match supported category values case-insensitively and return their lowercase canonical spelling.
- Treat the legacy value `environment` as `infra` for read compatibility.
- Treat missing, empty, or unsupported values as uncategorized.
- Do not silently convert unsupported values to `other`; `other` is an explicit supported classification.

If a non-null feedback value exists, it remains authoritative even when legacy or malformed. The system does not fall back to AI analysis merely because a stored feedback value cannot be normalized.

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

- Count a linked result at most once per issue, regardless of how many result errors or assumptions connect them.
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

### Issue Response Scope

Return `categorySummary` on issue read surfaces that previously supplied category display:

- REST issue list, detail, and with-statistics responses.
- MCP issue list, detail, and with-statistics responses.

Create, update, and delete responses return the issue core without `category` or `categorySummary`. A newly created issue therefore does not require an extra linked-result query merely to return an empty summary.

For issue with-statistics responses, `statFrom` and `statTo` apply to both the occurrence statistics and `categorySummary`. Issue list and detail summaries use all linked results.

### Issue Category Filtering

Remove issue filtering by persisted `Issue.category` without introducing a replacement category filter in this change. Existing clients using issue category filters must migrate to result filtering or consume derived category summaries.

If product requirements later need issue-list filtering, introduce a separately named `effectiveCategory` filter with explicit "any linked result matches" semantics in a follow-up change.

Alternatives considered:

- Keep the same `category` query parameter and silently reinterpret it. This minimizes client changes but makes the API contract easy to misunderstand.
- Add a new `effectiveCategory` query parameter immediately. This is viable if the UI needs issue-list category filtering in the same release, but it adds query complexity and should be explicitly tested.

### Statistics

Result stats and issue stats derive issue category information from linked results.

`topIssues` aggregates by issue ID, not issue name, so separate issues with identical names are not merged. Its response entries contain:

```ts
{
  id: string;
  title: string;
  count: number;
  categorySummary: IssueCategorySummary;
}
```

`count` is the number of distinct results linked to the issue within the result-stats filter. The same distinct result set feeds `categorySummary`, so `count` equals the sum of its distribution and `uncategorizedCount`.

### Dashboard Metrics

Dashboard issue metrics are also user-facing category reporting and therefore use the effective result category. Daily refresh queries select both analysis fields, calculate the effective category with the shared helper, and map canonical `infra` into the existing `issuesEnvironment` persistence/API bucket.

When category feedback changes, refresh the affected result's daily project/environment/type bucket in the same transaction, as already happens for AI analysis updates. This keeps persisted daily metrics consistent with the canonical category.

### Query Strategy

Issue list and with-statistics pages should fetch linked result data in one batch for all issue IDs on the page, then build per-issue distinct-result maps in memory. Reuse the selected result rows for occurrence statistics and category summaries. This replaces the current per-issue result query and avoids adding a new N+1 query pattern.

Issue detail may use the same batch helper with one issue ID. Result stats continue using their existing single result/relation query but select only the issue identity and result analysis fields needed for the revised aggregation.

## Risks / Trade-offs

- **Breaking API clients that send or read issue category** -> Document the contract removal in OpenAPI/MCP, update tests, and provide a clear migration path to result feedback fields.
- **Derived category queries may be more expensive than reading `Issue.category`** -> Compute summaries only in endpoints that need them, include only necessary result analysis fields, and add focused tests around query shape/performance-sensitive paths.
- **Multiple graph paths can duplicate a linked result** -> Deduplicate by `(issueId, resultId)` before occurrence and category aggregation.
- **Mixed category display can surprise users expecting one label** -> Expose `isMixed` and distribution so clients can render the ambiguity intentionally.
- **Historical issue category values will be dropped** -> Treat existing issue categories as non-authoritative. If preservation is required, export before migration or map manually to result feedback in a separate migration, but do not auto-copy issue category to results because there is no reliable one-to-one relationship.
- **Legacy category spelling differs across consumers** -> Normalize `environment` to canonical `infra` internally while retaining the existing dashboard `environment` response bucket.

## Migration Plan

1. Add a Prisma migration that drops the `Issue.category` column and the `Issue_projectId_category_idx` index.
2. Update generated Prisma types after the schema change.
3. Remove issue category from create/update inputs, serializers, OpenAPI schemas, MCP schemas, and TypeScript interfaces.
4. Add shared effective-category and category-summary helpers with legacy normalization and distinct-result semantics.
5. Update issue list/detail/stats logic to batch linked result reads and compute `categorySummary` on read responses.
6. Update result stats `topIssues` to aggregate by issue ID and distinct result ID.
7. Update dashboard aggregation to use effective categories and refresh metrics after feedback changes.
8. Update OpenAPI, MCP, API/MCP documentation, and Postman examples for the breaking contract.
9. Update tests for issue create/update/list/stats, MCP schemas, OpenAPI contracts, result statistics, and dashboard metrics.

Rollback strategy: restore the dropped column/index in a rollback migration if needed. Rollback cannot reconstruct previously dropped historical issue category values unless they were backed up before deployment.

## Resolved Questions

- Issue category filtering is removed without replacement in this release.
- `categorySummary` appears on REST/MCP issue list, detail, and with-statistics reads, but not create, update, or delete responses.
- Category summaries count distinct linked results.
- Date filters on issue with-statistics responses also constrain the category summary.
