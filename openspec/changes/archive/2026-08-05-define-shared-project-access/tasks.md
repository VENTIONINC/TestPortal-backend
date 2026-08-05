## 1. Shared Project Contract Coverage

- [x] 1.1 Add project route/controller regression tests proving an active member can list and read projects owned by another user.
- [x] 1.2 Add project mutation regression tests proving an active member can update and delete another user's project while normal validation still applies.
- [x] 1.3 Add a regression test proving normal project updates cannot change `ownerId`.

## 2. Project-Scoped Resource Coverage

- [x] 2.1 Add cross-owner access tests for execution, spec, result, and result-error flows.
- [x] 2.2 Add cross-owner access tests for issue and assumption flows.
- [x] 2.3 Add cross-owner access tests for dashboard, report, and PDF export flows.
- [x] 2.4 Add cross-owner access tests for authenticated JSON and CTRF upload flows.
- [x] 2.5 Audit project-scoped controllers and services and remove or avoid any owner filter or owner-only assertion that conflicts with the shared-workspace specification.

## 3. Upload API Key Integrity

- [x] 3.1 Update upload API key validation to require signed key, project, and owner identifiers to match the active stored key record.
- [x] 3.2 Add security regression tests for matching records, revoked or missing records, and signed payloads whose project or owner identifiers do not match storage.

## 4. Contract And Architecture Documentation

- [x] 4.1 Update project and project-scoped OpenAPI descriptions to state that active authenticated users operate in a shared workspace and that `ownerId` is not an access boundary.
- [x] 4.2 Update application architecture documentation to distinguish current shared access from future organization-based tenant isolation.
- [x] 4.3 Regenerate or update the Cartodex map so it no longer identifies project ownership as the current tenant boundary.

## 5. Verification

- [x] 5.1 Run the focused project-access and upload API key regression tests.
- [x] 5.2 Run `npm run type-check` and resolve all failures.
- [x] 5.3 Run `npm run lint` and resolve all failures.
- [x] 5.4 Run `npm test` and resolve all failures.
- [x] 5.5 Run `npm run build` and resolve all failures.
