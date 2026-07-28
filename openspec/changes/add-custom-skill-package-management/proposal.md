## Why

The skills API now has database-backed package persistence and seeded read-only system skills, but clients still cannot create or manage shared custom skills. Adding custom package management completes the package model by letting authenticated users upload validated skill zip packages into the existing shared skills catalog.

## What Changes

- Add authenticated creation of shared custom skills through zip package upload on the existing skills API.
- Validate uploaded zip packages before persistence using the existing normalized package validation rules.
- Persist valid uploaded packages as `source = custom` and `readOnly = false`.
- Reject skill-name collisions with existing system or custom skills using HTTP 409 Conflict.
- Add replacement/update behavior for custom skill packages while preserving the skill ID.
- Add deletion behavior for custom skills.
- Reject update and delete attempts for seeded read-only system skills.
- Keep existing list, detail, Markdown download, and archive download behavior for both system and custom skills.
- Document multipart upload, package replacement, deletion, validation errors, conflicts, and read-only errors in OpenAPI.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `skills-hub-artifacts`: Existing skills API gains create, update, and delete operations for shared custom skill packages.
- `skill-package-persistence`: Persisted skill packages can now be created, replaced, and deleted for custom skills while enforcing global name uniqueness and read-only system skill protection.
- `skill-archive-downloads`: Archive download behavior explicitly applies to uploaded custom skill packages as well as seeded system packages.

## Impact

- Skills REST routes and controller methods for custom package upload, replacement, and deletion.
- Skill service/model methods for create, replace, delete, conflict detection, and read-only protection.
- Zip parsing for uploaded packages, likely through the existing `jszip` dependency already used for archive generation.
- Existing package validation utilities, extended as needed to accept uploaded zip package input.
- OpenAPI schemas and route docs for multipart upload and mutation error responses.
- Service, controller, route, and package-validation tests for custom skill lifecycle behavior.
