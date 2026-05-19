# RepoBot MCP Server

A minimal MCP server that exposes a curated set of GitHub tools to RepoBot. All tools are
schema-validated, rate-limited, timeout-bounded, and payload-capped. Writes can be disabled
globally via `AGENT_DRY_RUN=1`.

## Run
```bash
export GITHUB_TOKEN=
npm install
npm start
```

## Adding a new tool
1. Open a PR that adds the tool implementation to `server.js` and registers it in
   `allowlist.json` with a description, scopes, rate limit, and whether it performs writes.
2. CODEOWNERS (`@contoso-devworks/platform` for tooling, `@contoso-devworks/security` for any
   new scope or write capability) must approve.
3. The PR must include a threat-model note in `docs/risks.md` if the tool adds a new
   capability class (network egress, secrets, write access to a new resource).
4. After merge, the tool is available to the agent immediately — no separate deployment.

## Boundaries enforced by the server
- Tools missing from `allowlist.json` return `tool_not_allowed`.
- Per-tool rate limits (60-second sliding window).
- 15-second hard timeout on every tool call.
- 64 KB max request payload size.
- `GITHUB_TOKEN` is read only from env; never accepted as a tool argument.
- Known secret patterns (`AKIA…`, `ghp_…`, `sk-…`) are redacted from inputs and outputs.
- `AGENT_DRY_RUN=1` short-circuits any tool marked `"writes": true` and returns the
  intended payload instead of performing the write.