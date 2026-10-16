## Context

Execution type is a string stored on each execution and populated from uploaded reports. The client currently exposes disabled type controls on Results and Issues, a disabled Dashboard selector with hard-coded values, and an export path that always submits `executionType: "all"`. Results and Dashboard backend queries already accept an optional type filter, while the Issues statistics endpoint does not. No API currently exposes the distinct execution types available for the selected project.

The change crosses both repositories in this workspace: `TestPortal-backend` owns project-scoped data access and OpenAPI definitions, while `TestPortal-client` owns filter state, URL synchronization, generated API bindings, and PDF request construction.

## Goals / Non-Goals

**Goals:**

- Let users choose any actual execution type present in the selected project.
- Give Results, Issues, Dashboard data, and dashboard PDF export consistent filtering semantics.
- Preserve execution-type spelling and casing from stored executions when displaying and submitting a filter.
- Keep the default behavior backward-compatible by showing data from all execution types.
- Define testable behavior for URL state, project changes, unavailable types, and empty projects.

**Non-Goals:**

- Creating, renaming, normalizing, or deleting execution types.
- Converting execution type into a database enum or maintaining a global catalog.
- Enabling the currently disabled execution-environment filter on Issues.
- Changing how report uploads determine an execution's type.
- Applying one page's selected execution type globally to other pages.

## Decisions

### 1. Discover types through a project-scoped backend endpoint

Add a read-only project endpoint that returns the distinct, non-empty execution-type strings stored for executions belonging to the requested project. Return values in deterministic, case-insensitive display order while preserving their original value.

The client will query this endpoint for the selected project and build each selector as `All` plus the returned values. Centralizing discovery prevents Results, Issues, Dashboard, and future consumers from independently inferring incomplete option lists from paginated page data.

Alternatives considered:

- A fixed client list was rejected because report-provided values are not constrained to Nightly, Release, or OnDemand.
- Deriving values from each page response was rejected because responses may be filtered or paginated, causing valid options to disappear.
- A global endpoint was rejected because it could expose irrelevant values from other projects and would make authorization boundaries less clear.

### 2. Use exact stored values and reserve `all` only as UI/export control state

Execution-type comparisons will use the selected stored value without client-side lowercasing. The selector's synthetic `All` option uses `all` as its control value. For APIs where type is optional, the client omits the parameter when `All` is selected. Dashboard PDF export keeps its existing required `executionType` field and sends `all` for the all-types case.

This preserves current backend contracts while avoiding accidental mismatch for custom or case-sensitive values. The discovery endpoint must not return an option that conflicts case-insensitively with the reserved `all` control value; such a stored value remains data but cannot be selected independently through this UI.

Alternative considered: making every endpoint accept `all` was rejected because omission already expresses an unfiltered query for Results, Issues, and Dashboard and avoids spreading sentinel handling through backend services.

### 3. Standardize the client filter key as `type`

Results and Issues already model the field as `type`, and the Dashboard API accepts a `type` query parameter. Rename Dashboard's local `execution` filter key to `type`; translate it to `executionType` only when constructing the PDF request.

Each page retains its own filter state and URL parameters. The initial value is `all`. Existing missing or empty URL values are interpreted as `all`. Reset returns to `all`.

Alternative considered: using `executionType` everywhere was rejected because it would require unnecessary changes to existing Results, Dashboard, and backend query contracts.

### 4. Reset an invalid selection when project context changes

Execution-type options are project-scoped. After a project change and completion of the new project's option query, if the active selection is neither `all` nor present in the returned options, the page resets it to `all` and updates its synchronized filter state. While options load, the selector is disabled; if discovery fails, the selector remains usable only for the current valid selection or `All`, and the page displays its existing non-blocking request-error behavior where available.

This prevents a stale type from silently producing empty data for the newly selected project.

Alternative considered: preserving an unavailable value was rejected because it presents a selection the user cannot choose and creates an ambiguous empty state.

### 5. Filter Issues statistics at the occurrence relation

Extend the Issues-with-statistics query contract with optional `type`. Apply it when selecting issue occurrences/results used to calculate occurrence counts, first/last occurrence, impacted tests, and time distribution. Issue identity/category/name filtering remains unchanged, but issues with zero matching occurrences are excluded from the filtered response.

Filtering only the displayed issue rows after aggregation was rejected because it would leave statistics calculated from unrelated execution types.

### 6. Keep Dashboard display and PDF scope identical

The effective Dashboard `type` selection is sent to the dashboard query (omitted for `all`) and used in the PDF payload (`executionType: selectedType` or `all`). Both standard and AI-enhanced exports use the same scope. Changing the type triggers the normal dashboard query refresh.

This avoids the current discrepancy where the screen can conceptually represent one filter while export always covers all types.

## Risks / Trade-offs

- [Distinct-value lookup adds a query when a project/page loads] → Add a project-scoped cache tag in the generated query layer and rely on RTK Query caching across consumers.
- [Arbitrary stored strings can contain whitespace or duplicate case variants] → Exclude empty/whitespace-only values, preserve returned values, and sort deterministically; do not silently normalize data in this change.
- [The reserved `all` value can collide with report data] → Exclude case-insensitive `all` from selectable discovered values and document the reservation in the API schema.
- [Issue statistics joins may become more expensive] → Apply project, execution type, and date predicates before aggregation and retain pagination at the issue-query level.
- [Generated API bindings can drift from backend contracts] → Regenerate bindings from the updated OpenAPI document and cover request arguments in client tests.
- [URL state may contain a stale or manually entered type] → Validate it against loaded project options and normalize invalid values to `all`.

## Migration Plan

1. Add and test backend type discovery and Issues statistics filtering, including OpenAPI definitions.
2. Regenerate the client API bindings from the updated backend contract.
3. Add the shared project execution-type option hook and wire each page incrementally.
4. Deploy backend before or together with the client. Until the new client is deployed, existing clients retain their current all-types behavior.
5. Roll back the client independently if needed; the added backend endpoint and optional Issues parameter are backward-compatible. Roll back backend only after the client rollback to avoid discovery request failures.

## Open Questions

None. The design treats execution types as project-scoped arbitrary strings, uses `All` as the backward-compatible default, and intentionally excludes environment-filter work.
