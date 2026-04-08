# MemPalace - Codex CLI Plugin

Give your AI a persistent memory -- mine projects and conversations into a searchable palace backed by ChromaDB, with 19 MCP tools, auto-save hooks, and guided skills.

## Prerequisites

- Python 3.9+
- Codex CLI installed and configured
- `mempalace` installed locally

## Installation

This repository already includes the `.codex-plugin` bundle. Codex should detect it automatically when you start a new session from this project root.

To verify detection:

```bash
codex --plugins
```

## Available Skills

| Skill | Description |
|-------|-------------|
| `/help` | Show available commands and usage tips |
| `/init` | Initialize a new memory palace |
| `/search` | Semantic search across all mined memories |
| `/mine` | Mine a project or conversation into your palace |
| `/status` | Show palace status, room counts, and health |

## Hooks

The plugin includes auto-save hooks for session start, stop, and pre-compaction. The hook wrapper delegates to MemPalace's Codex-native hook handler.

Set the `MEMPAL_DIR` environment variable to a directory path if you want hook-triggered auto-mining.

## Project Notes

- This repository uses `mempalace init . --yes` once to create ignored local bootstrap files.
- Indexed repository content currently lives under `~/.mempalace/palace`.
- Use `./scripts/mempalace-refresh.sh` to refresh the project memory after meaningful changes.
