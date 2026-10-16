## 1. Reverse Scenario Lookup

- [x] 1.1 Add a scenario/Spec link model query that takes a database Spec ID and `projectId`, filters both linked endpoints by that project, selects only scenario `id`, `title`, `details`, and generated `contentMd`, and orders by scenario `createdAt DESC`, then `id DESC`.
- [x] 1.2 Test the query predicates, selected fields including Markdown, deterministic tie break, multiple links, empty links, and exclusion of cross-project scenarios.

## 2. Result Detail Response

- [x] 2.1 Add a detail-specific response type and service operation that first resolves the Result through the existing project-scoped lookup, then adds `relatedTestScenarios` from its database Spec ID.
- [x] 2.2 Wire only the REST Result detail controller to the new operation; retain existing authentication, validation, not-found response, and generic Result consumers.
- [x] 2.3 Cover one and multiple scenarios, `[]`, all Result statuses, Markdown as a JSON string, unchanged Result fields, and no scenario lookup when the Result is not found.
- [x] 2.4 Add a database-backed lifecycle test showing that a later detail request reflects link addition/removal, current generated Markdown after scenario edits, scenario deletion, and project isolation without changing the stored Result.

## 3. Contract and Verification

- [x] 3.1 Document a required `relatedTestScenarios` array with exact `id`, `title`, nullable `details`, and `contentMd` JSON string fields in a detail-specific OpenAPI response schema, leaving other Result response schemas unchanged.
- [x] 3.2 Document the Result detail response in the API guide and test the generated OpenAPI schema, confirming list, evidence, and analysis response contracts do not promise the new field.
- [x] 3.3 Run `npm run type-check`, `npm run lint`, `npm test`, and `npm run build`; address any failures introduced by this change.
