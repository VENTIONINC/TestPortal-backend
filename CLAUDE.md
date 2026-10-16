<!-- VENTION-SDLC-MANAGED:BEGIN -->
### Vention SDLC framework — managed by `vsdlc`

This block is managed by `@vention/sdlc` and is rewritten on every `vsdlc install`. Add your own notes OUTSIDE the BEGIN/END markers.

- **Workspace:** `TestPortal-backend` (scenario: `single-repo`)
- **Issue tracker:** `youtrack` at `https://yt-wod.ventionteams.com/` (project: `TP`)

### OpenSpec Planning Root

The OpenSpec planning root is `openspec/` in the workspace root. Run OpenSpec commands from the workspace root. **Never run `openspec init` or `openspec new change` in a project repository.**

Ignore `openspec/changes/archive/` during routine exploration — it holds completed changes kept for historical record.

### Work Types & Branch Prefixes

The framework has four internal **work types**: `initiative`, `epic`, `userstory`, `bug`. The branch prefix follows the **tracker type** of the ticket. Skills read slugs from `vsdlc adapter issue-tracker` — they must not derive them.

**Current adapter (`youtrack`):**

| Work type | Vendor type | Branch prefix |
|-----------|-------------|-----------------|
| userstory | `User Story` | `userstory/` |
| bug | `Bug` | `bug/` |

Any work type may stand alone — a user story does not require a parent epic, and an epic does not require a parent initiative.

### Decomposition

| Work type | Decomposes into |
|-----------|-------------|
| initiative | epic |
| epic | userstory |
| userstory | — |
| bug | — |

### Tracking Failures

When a `vsdlc metrics` command (`init`, `activity-start` or `fact`) exits non-zero, stop: show the user the CLI's message word for word and wait for their choice. Run the same command with the same arguments again only when the user approves, and continue only with the user's explicit approval. Heartbeat and usage-upload failures never block your work.

### MCP usage notes

- **Figma** MCP — design lookups; no per-workspace header required.
- **`youtrack`** issue-tracker MCP — agents MUST go through the `vention-issue-tracker` capability skill rather than calling the vendor CLI or vendor MCP tool directly.

### Capability and adapter reference

`issue-tracker` capability bound to `youtrack` (base URL `https://yt-wod.ventionteams.com/`, project `TP`). Token resolved from $YT_TOKEN or $YOUTRACK_TOKEN or $VSDLC_YOUTRACK_TOKEN (the framework reads it from one of these env vars in declaration order — never hard-code it). Reads + writes flow through the `vention-issue-tracker` capability skill's adapter operations.

> Run `vsdlc install` to refresh this block. Do not edit between the markers.
<!-- VENTION-SDLC-MANAGED:END -->
