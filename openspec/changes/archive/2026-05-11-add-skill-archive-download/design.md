## Context

The skills hub currently serves a catalog, a JSON detail response, and a raw `SKILL.md` download for configured backend-owned skills. Skills can reference bundled files under their own folders, such as `assets/templates` and `references`, so a raw Markdown download is incomplete for clients that want to install or transfer a skill package.

## Goals / Non-Goals

**Goals:**
- Add an authenticated archive download endpoint for configured skills.
- Package the entire configured skill folder into a zip archive with `SKILL.md` and bundled resources.
- Preserve existing JSON and Markdown download behavior.
- Keep archive creation bounded to configured skill directories.

**Non-Goals:**
- Do not add dynamic skill discovery or arbitrary filesystem downloads.
- Do not change the skill catalog JSON shape.
- Do not create or modify MCP prompts.
- Do not introduce database persistence for skill archives.

## Decisions

- Use a zip archive response because clients broadly understand `.zip`, it preserves nested resource paths, and it can be streamed or buffered through Express without changing existing Markdown downloads. Alternative considered: tarball archives, rejected because the current API already targets general HTTP clients where zip is more portable.
- Add a distinct `GET /api/v2/skills/{name}/archive` endpoint instead of changing `/download`, because `/download` already has a raw Markdown contract and callers may depend on `text/markdown`.
- Build archives only from configured skill paths already known to `SkillArtifactService`. The route parameter remains a skill name lookup, never a filesystem path, so path traversal is avoided by construction.
- Include a top-level folder named after the skill inside the archive, containing the existing relative folder contents. This avoids dumping multiple files at archive root and keeps references such as `assets/templates/...` meaningful after extraction.
- Prefer a maintained zip creation dependency if the project does not already include one. The implementation should add the smallest dependency needed for deterministic archive creation in tests.

## Risks / Trade-offs

- Large skill folders could make archive generation expensive -> current configured skills are small; use in-memory buffers initially and revisit streaming only if artifacts grow.
- Archive contents could accidentally include unrelated files -> only traverse the configured skill directory and skip hidden/system files unless they are intentionally part of the skill contract.
- New dependency may increase install surface -> choose a focused zip library and cover the archive output with service tests.
