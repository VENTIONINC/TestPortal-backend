## Context

The backend currently ingests Playwright JSON reports through the JSON report controller and persists execution/result data through the existing report service. Playwright reports can contain custom metadata and attachments, but there is no first-class persisted artifact reference or access endpoint for private report artifacts stored in S3.

The final incoming JSON field that will carry the artifact reference is not confirmed yet. The implementation will therefore introduce a normalized backend artifact contract first and use mock extraction until the real source field is known.

AWS access is a runtime deployment concern. The application build must not require AWS credentials. Deployed environments provide AWS region, artifact bucket, and signed URL TTL through environment variables or IAM role credentials.

## Goals / Non-Goals

**Goals:**

- Persist private S3 artifact references for Playwright JSON uploads.
- Expose artifact availability in normal API responses without exposing raw S3 keys.
- Provide an authenticated, project-scoped endpoint that returns a short-lived signed URL on demand.
- Keep the first implementation compatible with mock extraction/signing while preserving the final S3 contract.
- Leave CTRF ingestion unchanged until provider-neutral artifact support is required.

**Non-Goals:**

- Uploading artifacts to S3 from this backend.
- Managing S3 buckets, object lifecycle, or retention policies.
- Requiring AWS credentials during build or type-check.
- Supporting non-S3 providers in the initial implementation.
- Finalizing the exact incoming Playwright JSON source field before it is known.

## Decisions

0. Store the initial S3 artifact reference on `Result`.

   The current Playwright JSON transform flattens Playwright suites into backend test specs and preserves each Playwright result independently. Playwright attachments are attached to those individual result objects, and the supported mock extraction therefore maps most directly to a single `Result` row. The execution remains the run container, while artifact availability is exposed on result responses and signed URL retrieval is result-scoped.

1. Store private artifact references server-side and expose only availability summaries.

   Normal read responses will return an artifact summary such as `{ provider: "s3", available: true }`. They will not return the S3 bucket, object key, or signed URL. This keeps storage details private and lets the client render artifact affordances without holding long-lived access data.

   Alternative considered: return raw S3 keys or signed URLs directly from execution/result reads. This was rejected because keys leak implementation details and signed URLs should be generated only when the client explicitly needs access.

2. Generate signed URLs on demand after authorization.

   A dedicated artifact URL endpoint will validate the caller and project scope using the same ownership boundaries as execution/result reads, then return a short-lived URL with `expiresAt`. The URL TTL will be configurable and default to a conservative short duration.

   Alternative considered: store signed URLs in the database at upload time. This was rejected because signed URLs expire and would require refresh logic anyway.

3. Configure AWS access at runtime.

   The backend will read runtime configuration such as `AWS_REGION`, `AWS_S3_ARTIFACT_BUCKET`, and `S3_SIGNED_URL_TTL_SECONDS`. In AWS-hosted deployments, credentials should come from the runtime IAM role. Non-AWS deployments may use standard AWS credential environment variables.

   Alternative considered: requiring AWS variables during build. This was rejected because the compiled app does not need AWS access and build-time secrets make deployment artifacts environment-specific.

4. Scope extraction to Playwright JSON uploads.

   The first implementation will attach artifact metadata only when processing Playwright JSON uploads. CTRF schemas and CTRF ingestion will remain unchanged.

   Alternative considered: adding artifact metadata to CTRF immediately. This was rejected because current need is Playwright-specific and the exact artifact source is still being discovered.

5. Keep the data model flexible enough for execution-level or result-level attachment.

   The latest sample suggests JSON files may represent a single test result, while earlier discussion considered run-level artifacts. The implementation should choose the narrowest confirmed attachment point during coding, but the normalized contract should not expose that distinction unnecessarily to clients.

## Risks / Trade-offs

- Artifact source field remains unknown → Use mock extraction behind a small adapter so final extraction can replace it without changing persistence or API contracts.
- Execution-level versus result-level ownership is ambiguous → Document the chosen attachment point during implementation and keep endpoint names/response schemas aligned with the actual stored entity.
- Missing AWS runtime configuration could break URL generation → Return a clear server configuration error and cover it with tests.
- Signed URLs can leak if copied by users → Keep TTL short and avoid logging generated URLs.
- Existing Playwright report shapes vary → Add a representative fixture and tests for the supported shape before wiring final extraction.

## Migration Plan

1. Add nullable artifact metadata fields to the selected persisted entity.
2. Deploy the schema migration before enabling extraction.
3. Add runtime configuration defaults and validation for signed URL generation.
4. Release mock extraction/signing to validate the API contract.
5. Replace mock extraction with the real Playwright JSON field once confirmed.

Rollback is safe because artifact fields are additive and nullable. Disabling the signed URL endpoint or extraction leaves existing report ingestion behavior intact.

## Open Questions

- Will the artifact be associated with a full execution/run or with one uploaded test-result JSON file?
- What exact field in the incoming Playwright JSON will contain the artifact reference?
- Will clients provide an S3 object key only, or a richer object containing provider and key?
- Should signed URL access be exposed through REST only, or also through MCP tools later?
