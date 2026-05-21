## Why

Playwright report uploads can reference private run or test artifacts stored in S3, but the backend currently has no normalized artifact contract or on-demand access flow. We need a stable API shape now so clients can detect artifact availability while the exact report-field extraction point is finalized.

## What Changes

- Add a backend-normalized S3 artifact reference to uploaded Playwright report processing.
- Store private artifact metadata server-side without exposing raw S3 keys in normal read responses.
- Return an artifact summary shaped as `{ provider: "s3", available: true }` when an execution or result has an artifact.
- Add an on-demand signed URL flow that verifies project access before returning a temporary URL and expiration timestamp.
- Start with mock artifact extraction/signing so the API contract can be implemented before the final source field in the report JSON is confirmed.
- Keep CTRF unchanged for now; this feature is scoped to Playwright JSON uploads.

## Capabilities

### New Capabilities

- `s3-artifact-links`: Private S3 artifact references for Playwright reports, including artifact availability in API responses and signed URL retrieval on demand.

### Modified Capabilities

None.

## Impact

- Prisma schema and migrations for persisted artifact metadata.
- Playwright JSON report transformation and persistence flow.
- Execution and/or result API response schemas.
- New signed artifact URL endpoint and OpenAPI documentation.
- AWS S3 presigning dependency and runtime configuration for region, bucket, and signed URL TTL.
- Tests for mock extraction, response shaping, authorization checks, and signed URL behavior.
