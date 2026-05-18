## 1. Data Model

- [x] 1.1 Decide and document whether the initial artifact reference is stored on `Execution` or `Result` based on the confirmed Playwright JSON source semantics.
- [x] 1.2 Add nullable artifact metadata fields for provider and private object key to the selected Prisma model.
- [x] 1.3 Create and verify the Prisma migration for the artifact metadata fields.
- [x] 1.4 Regenerate Prisma client types.

## 2. Report Ingestion

- [x] 2.1 Extend the internal report data types with a normalized optional S3 artifact reference.
- [x] 2.2 Add mock Playwright artifact extraction that produces a deterministic S3 object key for supported test uploads.
- [x] 2.3 Persist extracted artifact metadata during Playwright JSON report processing.
- [x] 2.4 Ensure reports without artifact metadata and CTRF uploads continue to process without artifact requirements.

## 3. Signed URL Service

- [x] 3.1 Add runtime S3 artifact configuration for region, bucket, and signed URL TTL.
- [x] 3.2 Add AWS SDK presigning dependencies.
- [x] 3.3 Implement a service that generates signed S3 artifact URLs from stored object keys.
- [x] 3.4 Return clear configuration errors when signing is requested without required runtime settings.

## 4. API Surface

- [x] 4.1 Add artifact availability summaries to the selected execution or result response shape.
- [x] 4.2 Add an authenticated, project-scoped endpoint for requesting a signed artifact URL.
- [x] 4.3 Ensure normal read responses never expose S3 bucket names, object keys, credentials, or signed URLs.
- [x] 4.4 Update OpenAPI schemas and route documentation for artifact availability and signed URL responses.

## 5. Tests and Verification

- [x] 5.1 Add a representative Playwright JSON fixture for the supported artifact flow.
- [x] 5.2 Add tests for mock extraction and persistence of artifact metadata.
- [x] 5.3 Add tests for artifact availability response shaping.
- [x] 5.4 Add tests for signed URL endpoint success, missing artifact, unauthorized project scope, and missing configuration.
- [x] 5.5 Run `npm run type-check`, `npm run lint`, `npm test`, and `npm run build`.
