"""End-to-end executor: plan -> decide -> call MCP tool -> trace."""
import json
import os
import sys
import time
from pathlib import Path

from planner.plan import build_plan
from reasoner.decide import decide

try:
    from mcp_client import call_tool  # provided in Step 3.4
except ImportError:
    def call_tool(tool, args):
        return {"ok": True, "stub": True, "tool": tool, "args": args}

MAX_STEPS = 12
TRACE_DIR = Path("runs")
TRACE_DIR.mkdir(exist_ok=True)

def run(issue: dict) -> Path:
    plan = build_plan(issue)
    trace_path = TRACE_DIR / f"{int(time.time())}-issue-{issue.get('number', 0)}.jsonl"
    seen, failures = {}, 0

    with trace_path.open("w") as f:
        f.write(json.dumps({"event": "plan", "data": plan}) + "\n")
        for i, step in enumerate(plan["steps"][:MAX_STEPS]):
            choice = decide(step)
            key = json.dumps(choice, sort_keys=True)
            seen[key] = seen.get(key, 0) + 1
            if seen[key] >= 3:
                f.write(json.dumps({"event": "abort", "reason": "loop_detected",
                                    "step": step["id"]}) + "\n")
                break
            try:
                result = call_tool(choice["tool"], choice["args"])
                failures = 0
            except Exception as exc:                       # noqa: BLE001
                failures += 1
                result = {"error": str(exc)}
                if failures >= 3:
                    f.write(json.dumps({"event": "abort", "reason": "circuit_breaker"}) + "\n")
                    break
            f.write(json.dumps({"event": "step", "step": step, "choice": choice,
                                "result": result}) + "\n")
        f.write(json.dumps({"event": "done"}) + "\n")
    print(f"trace: {trace_path}")
    return trace_path

if __name__ == "__main__":
    run(json.load(sys.stdin))