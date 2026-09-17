## 1. Runtime Contract

- [x] 1.1 Retain required persisted lowercase `Issue.category` and its category index; do not add a drop migration.
- [x] 1.2 Restore Issue category create, update, read, serialization, and filtering contracts.
- [x] 1.3 Keep Result effective-category analytics as `analysisFeedbackCategory ?? analysisCategory` with normalization and Dashboard `infra` mapping.

## 2. Issue Summaries And Statistics

- [x] 2.1 Return persisted Issue `category` and `categorySummary` on Issue reads and statistics responses.
- [x] 2.2 Set `categorySummary.displayCategory` from `Issue.category`.
- [x] 2.3 Derive summary distribution from all linked assumptions, deduplicated by Result ID; track uncategorized Results separately.
- [x] 2.4 Mark an Issue mixed only when at least two supported effective Result categories occur.
- [x] 2.5 Keep existing date and execution-type scoping for with-statistics summaries.

## 3. Assignment And Assumption Workflows

- [x] 3.1 Implement atomic create-and-assign and confirmed-edit ResultError modal operations.
- [x] 3.2 Synchronize a confirmed modal operation and generic assumption confirmation to the containing Result feedback category and Dashboard refresh.
- [x] 3.3 Keep generic assumption creation category-neutral and preserve feedback on unassign/reject.
- [x] 3.4 Prevent broad historical Result cascades when an Issue changes.

## 4. Contract Documentation

- [x] 4.1 Align OpenSpec requirements and design with scoped category authority.
- [x] 4.2 Align MCP tool reference with the registered Issue tools and their lowercase category contracts.
- [x] 4.3 Align Postman collection and generated Issue guides with authenticated V2 Issue and modal workflow endpoints.
- [x] 4.4 Update Dashboard documentation to identify effective Result category as the analytics source.

## 5. Verification

- [x] 5.1 Run `openspec validate analysis-category-source-of-truth --strict`.
- [x] 5.2 Parse updated Postman JSON collections and environment files.
- [x] 5.3 Review documentation examples against current route, OpenAPI, MCP registration, and service contracts.
