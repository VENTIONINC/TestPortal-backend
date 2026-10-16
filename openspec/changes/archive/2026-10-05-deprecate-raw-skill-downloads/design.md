## Context

The authenticated skills API persists every skill as a package with `SKILL.md` and zero or more package files. It currently exposes the package in two forms: a raw Markdown attachment at `/api/v2/skills/{id}/download` and a complete ZIP archive at `/api/v2/skills/{id}/archive`. A client cannot determine from a Markdown attachment whether the instructions rely on files omitted from that download.

The existing detail response already carries the Markdown body, and archive generation already creates a bounded ZIP from the requested skill's normalized persisted package files. This change is therefore an API-contract simplification rather than a persistence or packaging redesign.

## Goals / Non-Goals

**Goals:**

- Make a complete ZIP package the only downloadable and installable skills artifact.
- Preserve authenticated detail responses for previewing or inspecting a skill's Markdown source.
- Let catalog consumers discover the supported archive endpoint without constructing URLs themselves.
- Remove the misleading raw Markdown attachment route and its OpenAPI contract.

**Non-Goals:**

- Change how skill packages are validated, persisted, or archived.
- Introduce new archive formats, installation workflows, or client-side extraction.
- Remove Markdown content from the skill detail response.
- Provide a compatibility alias for the removed Markdown-download endpoint.

## Decisions

1. **Use the existing archive route as the canonical download.**

   `GET /api/v2/skills/{id}/archive` already represents the full persisted package and has the correct binary response headers. Reusing it avoids new routing and keeps resource paths intact. Replacing it with an archive response at `/download` was considered, but rejected because it would silently change the content type and payload received by consumers of the existing endpoint.

2. **Remove the raw Markdown attachment route instead of retaining it as an alternative export.**

   `GET /api/v2/skills/{id}/download` must be removed from routing, controller/service surface, OpenAPI, and tests. Keeping it, even with documentation discouraging use, would preserve an official-looking incomplete export and sustain the fragmentation risk. The detail response is retained because it is explicitly a preview/source representation, not an attachment or installation artifact.

3. **Keep the catalog field name `downloadUrl`, but point it to the ZIP archive.**

   The field continues to be the client action URL while its target becomes `/api/v2/skills/{id}/archive`. This minimizes client metadata-shape churn while making its value accurately represent the sole supported download. A new `archiveDownloadUrl` field was considered, but rejected because parallel URL fields would invite clients to keep choosing the deprecated Markdown route.

4. **Deploy the contract change atomically.**

   Route removal, catalog URL generation, OpenAPI, and API documentation ship together. The next release notes must flag the endpoint removal and direct API consumers to the archive URL. This is deliberate breaking behavior, not an implementation accident.

## Risks / Trade-offs

- **Existing consumers call the Markdown attachment endpoint** → Document the breaking change and migration in release/API notes; clients can use the existing archive route immediately.
- **Consumers use Markdown detail content as an installation source** → Clearly label detail `content` as preview/source content in OpenAPI and client documentation; portable downloads remain ZIP only.
- **A client assumes `downloadUrl` returns text** → Update the catalog schema description and client fixtures; the URL is already a download URL, so the field name remains appropriate.
- **ZIP generation fails for a package that previously returned Markdown** → Package validation and existing archive tests remain the protection; no new archive behavior is introduced.

## Migration Plan

1. Update API clients to call `downloadUrl` from the catalog, which will resolve to `/archive`, or directly use `/api/v2/skills/{id}/archive`.
2. Remove use of `/api/v2/skills/{id}/download`; use the detail endpoint only when previewing source text.
3. Deploy the backend route and contract updates with release notes identifying the removal as breaking.
4. If rollback is required, restore the removed route and prior OpenAPI/catalog URL behavior from the release branch; package data requires no rollback.

## Open Questions

None.
