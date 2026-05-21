## Why

The product already exposes predefined MCP-oriented prompts for users to copy and paste, but there is no equivalent way for the client to present reusable agent skills as downloadable artifacts. Adding a skills hub gives users a curated, discoverable path to download repository-approved `SKILL.md` files without coupling the feature to MCP prompt registration.

## What Changes

- Add a REST-backed skills catalog that lists predefined downloadable skills with metadata such as name, title, description, category, version, license, and compatibility.
- Add endpoints for retrieving a single skill and downloading its canonical `SKILL.md` artifact.
- Store backend-owned skill artifacts in a canonical repository location rather than serving user-specific `.codex`, `.claude`, or `.github` folders directly.
- Document the skills hub API in OpenAPI.
- Keep the feature independent from MCP prompt/resource registration.

## Capabilities

### New Capabilities

- `skills-hub-artifacts`: Provides authenticated REST discovery and download of predefined skill artifacts.

### Modified Capabilities

- None.

## Impact

- Adds new REST routes, controller, service, OpenAPI registration, and tests for listing, reading, and downloading skills.
- Adds canonical skill artifact files to the repository.
- Reuses existing authentication middleware and download response patterns.
- Does not change existing prompt routes, MCP prompt registration, database schema, or external dependencies unless archive packaging is added in a later change.
