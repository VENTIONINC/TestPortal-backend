## Why

The skills hub currently exposes raw `SKILL.md` downloads, but several skills reference bundled templates and reference files that are not included in that download. Clients need a complete, portable artifact that preserves the skill folder structure so installed skills work without missing resources.

## What Changes

- Add an authenticated archive download endpoint for each configured skill.
- Return a zip archive containing the skill's `SKILL.md` and bundled resource files under that skill folder.
- Keep existing JSON skill listing/detail responses and raw Markdown download behavior unchanged.
- Document the new archive response in the API contract.

## Capabilities

### New Capabilities
- `skill-archive-downloads`: Download complete skill packages, including `SKILL.md` and bundled resource files, as zip archives.

### Modified Capabilities
- None.

## Impact

- Skills API: new `GET /api/v2/skills/{name}/archive` route.
- Skill artifact service/controller: package configured skill directories as archives without allowing arbitrary path access.
- OpenAPI: document the archive endpoint and binary zip response.
- Dependencies: may require a zip creation library if the project does not already include one.
