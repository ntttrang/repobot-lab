"""Deterministic stub planner. Reads an issue payload from stdin and emits a JSON plan."""
import json
import re
import sys
from datetime import datetime, timezone

def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:40]

def build_plan(issue: dict) -> dict:
    title = issue.get("title", "untitled")
    body = issue.get("body") or ""
    number = issue.get("number", 0)

    steps = [
        {"id": 1, "action": "read_repo_layout", "input": {}, "expects": "file_tree"},
        {"id": 2, "action": "draft_change", "input": {"issue": number}, "expects": "diff"},
        {"id": 3, "action": "generate_tests", "input": {"issue": number}, "expects": "test_files"},
        {"id": 4, "action": "open_pull_request",
         "input": {"branch": f"agent/{number}-{slugify(title)}", "closes": number},
         "expects": "pr_url"},
    ]
    if re.search(r"\b(bug|error|fix)\b", (title + body).lower()):
        steps.insert(1, {"id": 99, "action": "reproduce_bug",
                          "input": {"issue": number}, "expects": "repro_log"})

    return {
        "issue": number,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "steps": steps,
        "max_steps": 12,
    }

if __name__ == "__main__":
    payload = json.load(sys.stdin)
    print(json.dumps(build_plan(payload), indent=2))