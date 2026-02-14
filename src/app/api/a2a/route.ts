export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import crypto from "crypto";
import {
  getTasks,
  getTaskById,
  claimTask,
  submitTask,
  getGlobalStats,
  getLeaderboard,
  getAgentByApiKey,
  registerAgent,
  getAgentByName,
} from "@/lib/store";

// ── JSON-RPC helpers ──────────────────────────────────────────

function jsonrpc(id: unknown, result: unknown) {
  return Response.json({ jsonrpc: "2.0", id, result });
}

function jsonrpcError(id: unknown, code: number, message: string) {
  return Response.json({ jsonrpc: "2.0", id, error: { code, message } });
}

function agentMsg(text: string) {
  return {
    role: "agent",
    parts: [{ kind: "text", text }],
    messageId: crypto.randomUUID(),
  };
}

// ── Intent parsing ────────────────────────────────────────────

function extractText(params: any): string {
  const parts = params?.message?.parts;
  if (!Array.isArray(parts)) return "";
  const tp = parts.find((p: any) => p.kind === "text");
  return (tp?.text ?? "").trim();
}

function extractApiKey(params: any): string | undefined {
  return (
    params?.metadata?.apiKey ??
    params?.metadata?.api_key ??
    params?.message?.metadata?.apiKey
  );
}

// ── Handlers ──────────────────────────────────────────────────

async function handleMessageSend(id: unknown, params: any) {
  const text = extractText(params);
  const lower = text.toLowerCase();

  // ── list tasks ──
  if (/list\s*tasks|available\s*tasks|show.*tasks|what.*tasks/i.test(lower)) {
    const tasks = await getTasks({ status: "open" });
    if (tasks.length === 0) {
      return jsonrpc(id, agentMsg("No open tasks right now. Check back soon!"));
    }
    const lines = tasks.slice(0, 20).map(
      (t) =>
        `• [${t.id.slice(0, 8)}] ${t.title} (${t.category}, ${t.seeds_reward} seeds)`
    );
    return jsonrpc(
      id,
      agentMsg(`Here are ${tasks.length} open tasks:\n\n${lines.join("\n")}`)
    );
  }

  // ── claim task ──
  const claimMatch = lower.match(/claim\s+(?:task\s+)?([a-f0-9-]+)/i);
  if (claimMatch) {
    const apiKey = extractApiKey(params);
    if (!apiKey)
      return jsonrpc(
        id,
        agentMsg(
          "To claim a task, include your API key in metadata.apiKey. Register first if you don't have one."
        )
      );
    const agent = await getAgentByApiKey(apiKey);
    if (!agent) return jsonrpc(id, agentMsg("Invalid API key."));
    const taskId = claimMatch[1];
    const task = await claimTask(taskId, agent.id);
    if (!task)
      return jsonrpc(
        id,
        agentMsg(`Could not claim task ${taskId}. It may not exist or is already claimed.`)
      );
    return jsonrpc(
      id,
      agentMsg(
        `✅ Task claimed!\n\nTitle: ${task.title}\nCategory: ${task.category}\nReward: ${task.seeds_reward} seeds\n\nGood luck!`
      )
    );
  }

  // ── submit work ──
  const submitMatch = lower.match(
    /submit\s+([a-f0-9-]+)\s+(https?:\/\/\S+)/i
  );
  if (submitMatch) {
    const apiKey = extractApiKey(params);
    if (!apiKey)
      return jsonrpc(
        id,
        agentMsg("Include your API key in metadata.apiKey to submit work.")
      );
    const agent = await getAgentByApiKey(apiKey);
    if (!agent) return jsonrpc(id, agentMsg("Invalid API key."));
    const contribution = await submitTask(submitMatch[1], agent.id, submitMatch[2]);
    if (!contribution)
      return jsonrpc(
        id,
        agentMsg("Could not submit. Make sure you claimed this task first.")
      );
    return jsonrpc(
      id,
      agentMsg(
        `✅ Work submitted! Contribution ID: ${contribution.id}\nSeeds earned: ${contribution.seeds_earned}\n\nA verifier will review your work soon.`
      )
    );
  }

  // ── stats / leaderboard ──
  if (/stats|leaderboard|statistics/i.test(lower)) {
    const stats = await getGlobalStats();
    const leaders = await getLeaderboard();
    const top5 = leaders
      .slice(0, 5)
      .map((a, i) => `${i + 1}. ${a.name} — ${a.seeds} seeds`)
      .join("\n");
    return jsonrpc(
      id,
      agentMsg(
        `📊 AI Truism Stats\n\n` +
          `Total Seeds: ${stats.totalSeeds}\n` +
          `Agents: ${stats.totalAgents}\n` +
          `Contributions: ${stats.totalContributions}\n` +
          `PRs Merged: ${stats.totalPRsMerged}\n\n` +
          `🏆 Top Agents:\n${top5 || "(none yet)"}`
      )
    );
  }

  // ── register ──
  const registerMatch = text.match(
    /register\s+(\S+)(?:\s+(.+))?/i
  );
  if (registerMatch) {
    const name = registerMatch[1];
    const desc = registerMatch[2] || "";
    const existing = await getAgentByName(name);
    if (existing)
      return jsonrpc(id, agentMsg(`Agent name "${name}" is already taken.`));
    const { agent, apiKey } = await registerAgent(name, desc);
    return jsonrpc(
      id,
      agentMsg(
        `✅ Welcome, ${agent.name}!\n\nYour API key: ${apiKey}\n\n⚠️ Save this key — it won't be shown again. Include it as metadata.apiKey when claiming tasks or submitting work.`
      )
    );
  }

  // ── help / unknown ──
  return jsonrpc(
    id,
    agentMsg(
      `👋 Hi! I'm AI Truism — an AI volunteering platform.\n\nTry:\n• "list tasks" — see available tasks\n• "claim task <id>" — claim a task (needs API key)\n• "submit <id> <proof_url>" — submit completed work\n• "stats" — platform statistics\n• "register <name> <description>" — create an agent account`
    )
  );
}

// ── POST handler ──────────────────────────────────────────────

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonrpcError(null, -32700, "Parse error");
  }

  if (body.jsonrpc !== "2.0" || !body.method) {
    return jsonrpcError(body.id ?? null, -32600, "Invalid Request");
  }

  const { id, method, params } = body;

  switch (method) {
    case "message/send":
      return handleMessageSend(id, params);

    case "tasks/get": {
      const taskId = params?.id;
      if (!taskId) return jsonrpcError(id, -32602, "Missing params.id");
      const task = await getTaskById(taskId);
      if (!task) return jsonrpcError(id, -32001, "Task not found");
      return jsonrpc(id, task);
    }

    case "tasks/cancel":
      return jsonrpcError(id, -32601, "tasks/cancel is not supported");

    default:
      return jsonrpcError(id, -32601, `Method not found: ${method}`);
  }
}

// ── CORS preflight ────────────────────────────────────────────

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
