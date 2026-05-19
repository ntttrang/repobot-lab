"""Deterministic stub reasoner: maps a plan step to a concrete MCP tool call."""
import json
import sys

ACTION_TO_TOOL = {
    "read_repo_layout":  ("list_changed_files", {"pr_number": 0}),
    "reproduce_bug":     ("get_issue",          {"number": "${issue}"}),
    "draft_change":      ("get_issue",          {"number": "${issue}"}),
    "generate_tests":    ("get_issue",          {"number": "${issue}"}),
    "open_pull_request": ("comment_on_pr",      {"pr_number": "${issue}",
                                                 "body": "RepoBot draft ready for review."}),
}


def decide(step: dict) -> dict:
    action = step["action"]
    tool, template = ACTION_TO_TOOL.get(action, (None, None))
    if tool is None:
        return {"error": "no_tool_for_action", "action": action}
    args = {k: (step["input"].get(v[2:-1], v) if isinstance(v, str) and v.startswith("${") else v)
            for k, v in template.items()}
    return {"tool": tool, "args": args}


if __name__ == "__main__":
    step = json.load(sys.stdin)
    print(json.dumps(decide(step), indent=2))