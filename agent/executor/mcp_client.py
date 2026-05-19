"""Thin stdio MCP client used by run.py to invoke server tools."""
import json
import os
import subprocess
import threading
import uuid

_proc = None
_lock = threading.Lock()


def _start():
    global _proc
    if _proc is None:
        _proc = subprocess.Popen(
            ["node", "mcp-server/server.js"],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            env={**os.environ},
            text=True, bufsize=1,
        )
    return _proc


def call_tool(name: str, args: dict) -> dict:
    with _lock:
        p = _start()
        msg = {"jsonrpc": "2.0", "id": str(uuid.uuid4()),
               "method": "tools/call", "params": {"name": name, "arguments": args}}
        p.stdin.write(json.dumps(msg) + "\n"); p.stdin.flush()
        line = p.stdout.readline()
    resp = json.loads(line)
    if resp.get("isError"):
        raise RuntimeError(resp["content"][0]["text"])
    return json.loads(resp["content"][0]["text"])