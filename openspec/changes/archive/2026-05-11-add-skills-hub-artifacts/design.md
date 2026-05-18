## Context

The backend currently exposes predefined prompt templates through authenticated REST routes and separately registers those prompts with MCP. The requested skills hub is different: the client needs downloadable skill artifacts, not MCP-connected prompts or resources.

The repository already contains consumer-specific skill folders (`.codex/skills`, `.claude/skills`, `.github/skills`), but those folders are not ideal as the server's runtime source of truth because they represent tool-specific distributions. The backend should serve a canonical, curated set of skill artifacts from a controlled location and let clients download those artifacts directly.

## Goals / Non-Goals

**Goals:**

- Provide authenticated REST endpoints for listing predefined skills, reading individual skill metadata, and downloading a skill artifact.
- Serve exact `SKILL.md` Markdown content with download headers suitable for client-side artifact download.
- Parse or define metadata consistently so the client can render skill cards without downloading every artifact first.
- Keep path handling safe by resolving skills from a registry or known scanned directory only.
- Document the new endpoints in OpenAPI and cover service/controller behavior with tests.

**Non-Goals:**

- Register skills with MCP as prompts or resources.
- Install skills into a user's local Codex, Claude, GitHub, or other tool-specific folder.
- Support user-uploaded or database-backed custom skills.
- Package multi-file skill archives in the initial implementation.
- Modify the existing prompt hub behavior.

## Decisions

1. Store canonical skills in a backend-owned artifact directory.

   Use a repository-controlled directory such as `src/skills/<skill-name>/SKILL.md` as the server source of truth. This keeps runtime behavior independent from `.codex`, `.claude`, and `.github` folders while still allowing those files to be copied from the same content during implementation.

   Alternative considered: serve directly from `.codex/skills`. That is convenient for the first skill but couples the API to one client/tool distribution and makes future multi-client support awkward.

2. Use a dedicated skills MVC slice.

   Add a `skillArtifactService`, `skillController`, `skillRoutes`, and `lib/openapi/skills.ts` rather than expanding prompt-specific classes. Prompts are parameterized generators; skills are static downloadable artifacts. Keeping the slices separate avoids muddy abstractions while preserving familiar repository patterns.

   Alternative considered: rename prompts into a generic "hub" service. That is broader than needed and risks unnecessary churn in stable prompt endpoints.

3. Serve Markdown downloads first and defer package archives.

   The initial download endpoint should return `text/markdown; charset=utf-8` with `Content-Disposition: attachment; filename="<skill-name>-SKILL.md"`. This satisfies the current client need without adding archive generation dependencies.

   Alternative considered: always generate `.zip` packages. That would be useful if skills include scripts/assets, but it adds complexity before the first use case needs it.

4. Extract metadata from skill frontmatter where possible.

   Skill files already follow a frontmatter-plus-Markdown shape. The service should expose fields such as `name`, `description`, `license`, `compatibility`, and `metadata.version` from frontmatter, with any API-specific fields such as `category` supplied by the catalog entry if they are not part of the skill file.

   Alternative considered: duplicate all metadata in TypeScript. That is simpler to type but makes it easier for the list endpoint and downloaded artifact to drift.

5. Whitelist skill names.

   The API must not resolve arbitrary request path values into filesystem paths. The service should enumerate allowed skill entries from known directories or an explicit registry and return `404` for unknown names.

## Risks / Trade-offs

- Skill metadata parsing may fail for malformed frontmatter -> Validate at service load/read time and treat malformed configured skills as server errors covered by tests.
- REST metadata could drift from artifact content -> Prefer frontmatter-derived metadata and keep catalog-only metadata minimal.
- A raw Markdown endpoint may not be enough for future multi-file skills -> Keep the route design extensible so `/package` can be added later without changing `/download`.
- Serving repository files at runtime can be fragile after build output changes -> Ensure the implementation resolves artifact paths in both TypeScript development and built server contexts, or copies skill artifacts into the build output as part of the chosen implementation.
