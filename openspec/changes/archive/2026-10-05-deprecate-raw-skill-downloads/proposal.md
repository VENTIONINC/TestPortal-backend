## Why

A skill is a package, not necessarily a standalone `SKILL.md` file: its instructions can depend on bundled references, scripts, templates, and other resources. Offering a raw Markdown file as a downloadable artifact can therefore create an incomplete installation that appears valid but no longer works as authored.

The archive endpoint already preserves the complete package, so the API should present that format as the single supported portable download.

## What Changes

- Make the ZIP archive endpoint the supported download mechanism for persisted skills.
- **BREAKING** Remove the raw Markdown attachment endpoint, `GET /api/v2/skills/{id}/download`.
- Retain Markdown only within authenticated skill-detail responses as preview/source content; document that it is not a portable or installable artifact.
- **BREAKING** Replace catalog metadata that advertises a Markdown `downloadUrl` with an archive download URL.
- Update generated OpenAPI documentation, client-facing API documentation, and tests to describe ZIP packages as the canonical export.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `skills-hub-artifacts`: Make the catalog and detail API advertise complete ZIP packages and treat Markdown content as preview only; remove the raw Markdown download contract.
- `skill-archive-downloads`: Establish ZIP archives as the sole supported portable skill download, rather than an additive alternative to raw Markdown downloads.

## Impact

- Affected REST routes, skill controller/service types, catalog/detail response schemas, OpenAPI registration, and skills tests.
- API consumers must replace calls to `/api/v2/skills/{id}/download` with `/api/v2/skills/{id}/archive` and consume the archive URL from catalog metadata.
- No database schema or package storage changes are expected; persisted package files already supply the required archive contents.
