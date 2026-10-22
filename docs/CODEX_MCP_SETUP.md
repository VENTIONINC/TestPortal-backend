# Codex Docker MCP setup

This repository uses Docker MCP Toolkit's shared `testportal` profile, following
the `invivo_c1` gateway pattern. The profile has a project-wide name so other
TestPortal repositories can reuse it. It currently provides GitHub tools; it is
separate from the backend's own `/api/v2/mcp` endpoint.

## Setup on another machine

1. Install Docker Desktop with MCP Toolkit support and start Docker Desktop.
2. Authenticate the GitHub Official server through Docker MCP Toolkit. Credentials
   stay in Docker's secret store; the exported profile contains a reference to
   the `default` secret set, not the token itself.
3. Check existing profiles with `docker mcp profile list`. If `testportal` is
   absent, import this repository's snapshot:

   ```sh
   docker mcp profile import .docker/mcp-profile.json
   ```

   If it already exists, inspect it with `docker mcp profile show testportal`
   before importing: other TestPortal repositories may share that profile.
4. Open the trusted repository in Codex. Its `.codex/config.toml` starts:

   ```sh
   docker mcp gateway run --profile testportal
   ```

The gateway is optional (`required = false`). Docker must be running for its
tools to initialize. The repository disables the GitHub app and known direct
GitHub MCP connections to avoid duplicate tools. GitHub write tools have explicit
`prompt` approval overrides; read tools use `auto`.

## Verify

```sh
codex mcp list
docker mcp tools --gateway-arg=--profile --gateway-arg=testportal ls
docker mcp tools --gateway-arg=--profile --gateway-arg=testportal call get_file_contents owner=VENTIONINC repo=TestPortal-backend path=package.json ref=refs/heads/feature/TMS
```

The profile exposes 14 tools: `get_me`, `get_file_contents`, `list_pull_requests`,
`pull_request_read`, `search_pull_requests`, `issue_read`, `list_issues`,
`search_issues`, `issue_write`, `create_pull_request`, `update_pull_request`,
`add_issue_comment`, `add_reply_to_pull_request_comment`, and
`pull_request_review_write`. Docker CLI tool arguments use `key=value`, rather
than a positional JSON object.

## Reuse and maintain

On this machine, another TestPortal repository can use the same profile by copying
the gateway and approval settings from `.codex/config.toml`. Importing the profile
again is unnecessary. Include `.docker/mcp-profile.json` there only if that
repository also needs a portable setup snapshot. No changes to sibling repositories
are required to use this repository's setup.

The legacy `testportal-github` profile is retained for existing consumers. New
TestPortal configuration should reference `testportal`.

To add servers or change tool access, update the shared profile through Docker MCP
Toolkit, review the corresponding Codex approval settings, and export the result:

```sh
docker mcp profile export testportal .docker/mcp-profile.json
```

Profile changes affect every repository using `testportal` on this machine.
The snapshot pins the GitHub server image by digest and includes Docker's catalog
metadata. Keep credentials out of the snapshot and commit profile changes together
with the relevant configuration/documentation changes.

Codex configuration fields are documented in the
[official configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).
