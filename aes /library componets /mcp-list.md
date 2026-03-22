# MCP List

This file is the Codex-owned MCP inventory for `/Users/sunday/Desktop/web2`.

It now tracks two layers:
- project-local MCP visibility in `web2`
- shared global MCP configuration intended to work across projects

## Status legend
- `configured` = explicitly present in config
- `verified` = entrypoint starts cleanly in this workspace
- `doc-only` = referenced in project docs but not verified from config
- `unverified` = expected by architecture, but not proven live from this workspace

## Shared global MCPs

These are now configured in:
- [/Users/sunday/.claude/settings.json](/Users/sunday/.claude/settings.json)
- [/Users/sunday/.codex/config.toml](/Users/sunday/.codex/config.toml)

### `hopper`
- status: `configured`, `verified`
- evidence:
  - [/Users/sunday/.claude/settings.json](/Users/sunday/.claude/settings.json)
  - [/Users/sunday/.codex/config.toml](/Users/sunday/.codex/config.toml)
- verification:
  - `HopperMCPServer` binary starts cleanly from `/Applications/Hopper Disassembler.app/Contents/MacOS/HopperMCPServer`
- note:
  - Claude global config did not previously include Hopper; it does now

### `neo4j-memory`
- status: `configured`, `verified`
- evidence:
  - [/Users/sunday/.claude/settings.json](/Users/sunday/.claude/settings.json)
  - [/Users/sunday/.codex/config.toml](/Users/sunday/.codex/config.toml)
- verification:
  - stdio server starts and reports `Neo4j MCP server running on stdio`

### `gemini-verify`
- status: `configured`, `verified`
- evidence:
  - [/Users/sunday/.claude/settings.json](/Users/sunday/.claude/settings.json)
  - [/Users/sunday/.codex/config.toml](/Users/sunday/.codex/config.toml)
- verification:
  - stdio server starts and reports `gemini-verify MCP server running on stdio`

### `perplexity`
- status: `configured`, `verified`
- evidence:
  - [/Users/sunday/.claude/settings.json](/Users/sunday/.claude/settings.json)
  - [/Users/sunday/.codex/config.toml](/Users/sunday/.codex/config.toml)
- verification:
  - server entrypoint starts cleanly with the local API key present

### `reviewer-codex-mcp`
- status: `configured`, `verified`
- evidence:
  - [/Users/sunday/.claude/settings.json](/Users/sunday/.claude/settings.json)
  - [/Users/sunday/.codex/config.toml](/Users/sunday/.codex/config.toml)
- verification:
  - stdio server starts and reports `reviewer-codex-mcp running`

### `testrunner-mcp`
- status: `configured`, `verified`
- evidence:
  - [/Users/sunday/.claude/settings.json](/Users/sunday/.claude/settings.json)
  - [/Users/sunday/.codex/config.toml](/Users/sunday/.codex/config.toml)
- verification:
  - stdio server starts and reports `testrunner-mcp running`

### `autocontext`
- status: `configured`, `verified`
- evidence:
  - [/Users/sunday/.claude/settings.json](/Users/sunday/.claude/settings.json)
  - [/Users/sunday/.codex/config.toml](/Users/sunday/.codex/config.toml)
- verification:
  - MCP extras were installed with `uv sync --extra mcp`
  - the `autoctx mcp-serve` entrypoint now starts cleanly

## Configured locally

### `neo4j-memory`
- status: `configured`
- evidence:
  - [.claude/settings.local.json](/Users/sunday/Desktop/web2/.claude/settings.local.json)
- allowed capability seen:
  - `mcp__neo4j-memory__execute_query`
- note:
  - this is the clearest canonical graph MCP in local settings
  - project architecture expects it, but the app runtime is still using fallback graph behavior unless Neo4j connectivity is wired

### `hopper`
- status: `configured`
- evidence:
  - [.claude/settings.local.json](/Users/sunday/Desktop/web2/.claude/settings.local.json)
- allowed capability seen:
  - `mcp__hopper__current_document`
- note:
  - this is for Hopper integration, not the `web2` operational graph

### `Claude_Preview`
- status: `configured`
- evidence:
  - [.claude/settings.local.json](/Users/sunday/Desktop/web2/.claude/settings.local.json)
- allowed capability seen:
  - `mcp__Claude_Preview__preview_start`

## Referenced in AES docs

### `reviewer-codex-mcp`
- status: `doc-only`, `verified globally`
- evidence:
  - [audit-amendments.md](/Users/sunday/Desktop/web2/claude-docs/references/audit-amendments.md)
- referenced role:
  - review/code review stage in the audit loop

### `perplexity-mcp`
- status: `doc-only`, `verified globally`
- evidence:
  - [audit-amendments.md](/Users/sunday/Desktop/web2/claude-docs/references/audit-amendments.md)
- referenced role:
  - validation/search stage
- note:
  - docs explicitly mention it being unavailable in at least one recorded run

### `testrunner-mcp`
- status: `doc-only`, `verified globally`
- evidence:
  - [audit-amendments.md](/Users/sunday/Desktop/web2/claude-docs/references/audit-amendments.md)
- referenced role:
  - quality pipeline / test runner stage

## Machine-present tooling

### `gemini`
- status: `machine-present`
- evidence:
  - Gemini-related local files were found on this machine under `/Users/sunday/.gemini/...`
- note:
  - the MCP-equivalent server in shared config is `gemini-verify`
  - `gemini-verify` is globally configured and verified
  - `gemini` itself is still not a `web2` project-local MCP name in `.claude/settings.local.json`

## Architecture-adjacent but not MCP-proven

### Neo4j graph bridge in app runtime
- status: `unverified`
- evidence:
  - [graphBridge.ts](/Users/sunday/Desktop/web2/convex/graphBridge.ts)
- note:
  - the repo contains graph bridge code
  - it falls back to embedded rules when no live Neo4j endpoint is configured
  - `NEO4J_URL` is not currently configured in [.env.local](/Users/sunday/Desktop/web2/.env.local)

## Practical current list
If you only want the MCP names that are directly relevant right now:

1. `neo4j-memory`
2. `hopper`
3. `Claude_Preview`
4. `reviewer-codex-mcp`
5. `perplexity-mcp`
6. `testrunner-mcp`
7. `gemini`

## Current best reading
- `neo4j-memory`, `hopper`, and `Claude_Preview` are the only ones explicitly configured in local project settings
- the broader shared MCP set is now configured globally for both Claude and Codex
- `reviewer-codex-mcp`, `perplexity`, `testrunner-mcp`, `autocontext`, and `gemini-verify` are globally verified even though they are not listed in `web2` local project settings
- `gemini` is present on the machine, while `gemini-verify` is the verified shared MCP server name
