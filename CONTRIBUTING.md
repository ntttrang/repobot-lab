# Contributing

## Agent-Generated Work
Pull requests authored by RepoBot follow stricter conventions than human PRs:

- **Identity:** Commits are authored by the `repobot-agent` machine user and include a
  `Co-authored-by: RepoBot <bot@contoso.dev>` trailer.
- **Labeling:** Every agent PR carries the `agent-authored` label, applied automatically by
  the triage workflow.
- **Linkage:** The PR description must contain `Closes #<issue>` referencing the source issue,
  plus a link to the Actions run that produced the change.
- **Review:** At least one human reviewer from CODEOWNERS must approve. The
  `agent-guardrails` status check must pass. Agent PRs cannot be self-approved.
- **Scope:** Agent PRs touching files owned by CODEOWNERS in `/agent/**`, `/mcp-server/**`,
  or `.github/**` require an additional security reviewer.