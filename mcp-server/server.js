import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Octokit } from "octokit";
import { readFileSync } from "node:fs";

const allow   = JSON.parse(readFileSync(new URL("./allowlist.json", import.meta.url)));
const DRY     = process.env.AGENT_DRY_RUN === "1";
const TOKEN   = process.env.GITHUB_TOKEN;
if (!TOKEN) throw new Error("GITHUB_TOKEN must be set in env, never via args.");
const octokit = new Octokit({ auth: TOKEN });

const SECRET_RE = /AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|sk-[A-Za-z0-9]{20,}/g;
const redact = (s) => (typeof s === "string" ? s.replace(SECRET_RE, "[REDACTED]") : s);

const buckets = new Map();
function rateLimit(name, perMin) {
  const now = Date.now();
  const arr = (buckets.get(name) ?? []).filter((t) => now - t < 60_000);
  if (arr.length >= perMin) throw new Error("rate_limited");
  arr.push(now); buckets.set(name, arr);
}

const MAX_BYTES = 64 * 1024;
const TIMEOUT_MS = 15_000;

function guard(name) {
  const cfg = allow.tools.find((t) => t.name === name);
  if (!cfg) throw new Error("tool_not_allowed");
  rateLimit(name, cfg.rate_per_minute);
  return cfg;
}

async function withTimeout(p) {
  return Promise.race([
    p,
    new Promise((_, r) => setTimeout(() => r(new Error("timeout")), TIMEOUT_MS)),
  ]);
}

const repoSchema = z.object({ owner: z.string(), repo: z.string() }).default({
  owner: "contoso-devworks", repo: "repobot-lab",
});

const tools = {
  get_issue: {
    schema: z.object({ number: z.number().int().positive() }).merge(repoSchema.partial()),
    handler: async ({ number, owner = "contoso-devworks", repo = "repobot-lab" }) => {
      guard("get_issue");
      const { data } = await withTimeout(octokit.rest.issues.get({ owner, repo, issue_number: number }));
      return { number: data.number, title: data.title, body: redact(data.body), state: data.state };
    },
  },
  list_changed_files: {
    schema: z.object({ pr_number: z.number().int().nonnegative() }).merge(repoSchema.partial()),
    handler: async ({ pr_number, owner = "contoso-devworks", repo = "repobot-lab" }) => {
      guard("list_changed_files");
      if (pr_number === 0) return { files: [] };
      const { data } = await withTimeout(
        octokit.rest.pulls.listFiles({ owner, repo, pull_number: pr_number }),
      );
      return { files: data.map((f) => ({ filename: f.filename, status: f.status })) };
    },
  },
  comment_on_pr: {
    schema: z.object({
      pr_number: z.number().int().positive(),
      body: z.string().min(1).max(4000),
    }).merge(repoSchema.partial()),
    handler: async ({ pr_number, body, owner = "contoso-devworks", repo = "repobot-lab" }) => {
      guard("comment_on_pr");
      const safe = redact(body);
      if (DRY) return { dry_run: true, would_post: safe };
      const { data } = await withTimeout(
        octokit.rest.issues.createComment({ owner, repo, issue_number: pr_number, body: safe }),
      );
      return { id: data.id, url: data.html_url };
    },
  },
};

const server = new Server({ name: "repobot-mcp", version: "0.1.0" }, { capabilities: { tools: {} } });

server.setRequestHandler("tools/list", async () => ({
  tools: allow.tools.map((t) => ({ name: t.name, description: t.description })),
}));

server.setRequestHandler("tools/call", async (req) => {
  const { name, arguments: rawArgs } = req.params;
  const tool = tools[name];
  if (!tool) return { isError: true, content: [{ type: "text", text: "tool_not_allowed" }] };
  const argsJson = JSON.stringify(rawArgs ?? {});
  if (Buffer.byteLength(argsJson) > MAX_BYTES)
    return { isError: true, content: [{ type: "text", text: "payload_too_large" }] };
  const parsed = tool.schema.safeParse(rawArgs);
  if (!parsed.success)
    return { isError: true, content: [{ type: "text", text: "bad_args" }] };
  try {
    const result = await tool.handler(parsed.data);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (e) {
    return { isError: true, content: [{ type: "text", text: e.message }] };
  }
});

await server.connect(new StdioServerTransport());