# SDLC Responsibility Map

| SDLC stage | Agent task | Input | Output | Success criteria |
|---|---|---|---|---|
| Triage | Categorize and label new issues | `issue.body`, `issue.title` | JSON plan + labels applied | Plan posted within 60s; at least one label applied; type identified (bug/feature/question) |
| Implementation | Draft code change for a labeled issue | Issue JSON, repo file tree | Branch + PR with diff | PR opens against `main`; touches ≤10 files; references `Closes #<n>` |
| Testing | Generate unit tests for new code | Changed file list, diff | Test files in same PR | New tests cover ≥80% of added lines (measured by coverage report) |
| PR summary | Produce reviewer-friendly PR description | PR diff, commit messages | Markdown summary in PR body | Summary references every changed file; lists risks; under 300 words |
| Release notes | Draft notes from merged PRs | List of PRs since last tag | `CHANGELOG.md` entry | Each merged PR appears once; grouped by label; reviewed by human before tag |