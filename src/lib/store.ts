/**
 * Data store — Supabase REST API with in-memory fallback.
 * Uses raw fetch (not JS client) because Supabase JS client has issues on Vercel.
 */
import { Agent, Task, Contribution, VolunteerSession, TaskFeedback } from "./types";
import { mockAgents, mockTasks, mockContributions } from "@/data/mock";
import crypto from "crypto";

// ============================================================
// Supabase REST helpers
// ============================================================
function cfg() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function headers(c: { key: string }) {
  return {
    'apikey': c.key,
    'Authorization': `Bearer ${c.key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}

async function query<T = any>(table: string, params: string = ""): Promise<T[] | null> {
  const c = cfg();
  if (!c) return null;
  const res = await fetch(`${c.url}/rest/v1/${table}?${params}`, {
    headers: headers(c), cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

async function queryOne<T = any>(table: string, params: string): Promise<T | null> {
  const c = cfg();
  if (!c) return null;
  const res = await fetch(`${c.url}/rest/v1/${table}?${params}&limit=1`, {
    headers: { ...headers(c), 'Accept': 'application/vnd.pgrst.object+json' },
    cache: 'no-store',
  });
  if (!res.ok || res.status === 406) return null;
  return res.json();
}

async function insert<T = any>(table: string, body: any): Promise<T> {
  const c = cfg();
  if (!c) throw new Error("Supabase not configured");
  const res = await fetch(`${c.url}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...headers(c), 'Accept': 'application/vnd.pgrst.object+json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.details || `Insert failed: ${res.status}`);
  }
  return res.json();
}

async function update<T = any>(table: string, params: string, body: any): Promise<T | null> {
  const c = cfg();
  if (!c) return null;
  const res = await fetch(`${c.url}/rest/v1/${table}?${params}`, {
    method: 'PATCH',
    headers: { ...headers(c), 'Accept': 'application/vnd.pgrst.object+json' },
    body: JSON.stringify(body),
  });
  if (!res.ok || res.status === 406) return null;
  return res.json();
}

// ============================================================
// In-memory fallback
// ============================================================
interface Store {
  agents: Agent[]; tasks: Task[]; contributions: Contribution[];
  sessions: VolunteerSession[]; feedback: TaskFeedback[];
  apiKeys: Map<string, string>; initialized: boolean;
}

const globalStore = globalThis as unknown as { __aitruist_store?: Store };

function getStore(): Store {
  if (!globalStore.__aitruist_store) {
    const apiKeys = new Map<string, string>();
    mockAgents.forEach((a) => {
      apiKeys.set(`ait_${a.id.slice(0, 8)}`, a.id);
    });
    globalStore.__aitruist_store = {
      agents: [...mockAgents], tasks: [...mockTasks],
      contributions: [...mockContributions], sessions: [], feedback: [],
      apiKeys, initialized: true,
    };
  }
  return globalStore.__aitruist_store;
}

function hash(val: string) {
  return crypto.createHash("sha256").update(val).digest("hex");
}

function useDb() { return !!cfg(); }

// ============================================================
// Agents
// ============================================================
export async function getAgentByApiKey(key: string): Promise<Agent | undefined> {
  if (useDb()) {
    const keyHash = hash(key);
    const agent = await queryOne<Agent>("agents", `api_key_hash=eq.${keyHash}`);
    return agent || undefined;
  }
  const store = getStore();
  const agentId = store.apiKeys.get(key);
  return agentId ? store.agents.find((a) => a.id === agentId) : undefined;
}

export async function getAgentByName(name: string): Promise<Agent | undefined> {
  if (useDb()) {
    const agent = await queryOne<Agent>("agents", `name=ilike.${encodeURIComponent(name)}`);
    return agent || undefined;
  }
  return getStore().agents.find((a) => a.name.toLowerCase() === name.toLowerCase());
}

export async function getAgentById(id: string): Promise<Agent | undefined> {
  if (useDb()) {
    const agent = await queryOne<Agent>("agents", `id=eq.${id}`);
    return agent || undefined;
  }
  return getStore().agents.find((a) => a.id === id);
}

export async function registerAgent(name: string, description: string): Promise<{ agent: Agent; apiKey: string }> {
  const apiKey = `ait_${crypto.randomBytes(24).toString("hex")}`;
  const keyHash = hash(apiKey);
  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`;

  if (useDb()) {
    const agent = await insert<Agent>("agents", {
      name, description, avatar_url: avatarUrl, api_key_hash: keyHash,
    });
    return { agent, apiKey };
  }

  const store = getStore();
  const id = crypto.randomUUID();
  const agent: Agent = {
    id, name, description, avatar_url: avatarUrl, api_key_hash: keyHash,
    seeds: 0, contributions_count: 0, created_at: new Date().toISOString(),
  };
  store.agents.push(agent);
  store.apiKeys.set(apiKey, id);
  return { agent, apiKey };
}

// ============================================================
// Tasks
// ============================================================
export async function getTasks(filters?: {
  category?: string; difficulty?: string; status?: string; language?: string;
}): Promise<Task[]> {
  if (useDb()) {
    let params = "order=created_at.desc";
    if (filters?.category) params += `&category=eq.${encodeURIComponent(filters.category)}`;
    if (filters?.difficulty) params += `&difficulty=eq.${encodeURIComponent(filters.difficulty)}`;
    if (filters?.status) params += `&status=eq.${encodeURIComponent(filters.status)}`;
    if (filters?.language) params += `&language=ilike.${encodeURIComponent(filters.language)}`;
    return (await query<Task>("tasks", params)) || [];
  }
  let result = getStore().tasks;
  if (filters?.category) result = result.filter((t) => t.category === filters.category);
  if (filters?.difficulty) result = result.filter((t) => t.difficulty === filters.difficulty);
  if (filters?.status) result = result.filter((t) => t.status === filters.status);
  if (filters?.language) result = result.filter((t) => t.language?.toLowerCase() === filters.language!.toLowerCase());
  return result;
}

export async function getTaskById(id: string): Promise<Task | undefined> {
  if (useDb()) {
    return (await queryOne<Task>("tasks", `id=eq.${id}`)) || undefined;
  }
  return getStore().tasks.find((t) => t.id === id);
}

export async function claimTask(taskId: string, agentId: string): Promise<Task | null> {
  if (useDb()) {
    return await update<Task>("tasks", `id=eq.${taskId}&status=eq.open`, {
      status: "claimed", claimed_by: agentId,
    });
  }
  const task = getStore().tasks.find((t) => t.id === taskId);
  if (!task || task.status !== "open") return null;
  task.status = "claimed";
  task.claimed_by = agentId;
  return task;
}

export async function submitTask(taskId: string, agentId: string, proofUrl?: string, proofText?: string): Promise<Contribution | null> {
  if (useDb()) {
    const task = await queryOne<Task>("tasks", `id=eq.${taskId}&claimed_by=eq.${agentId}`);
    if (!task) return null;
    await update("tasks", `id=eq.${taskId}`, { status: "submitted" });
    return await insert<Contribution>("contributions", {
      agent_id: agentId, task_id: taskId,
      proof_url: proofUrl, proof_text: proofText,
      seeds_earned: task.seeds_reward,
    });
  }
  const store = getStore();
  const task = store.tasks.find((t) => t.id === taskId);
  if (!task || task.claimed_by !== agentId) return null;
  task.status = "submitted";
  const contribution: Contribution = {
    id: crypto.randomUUID(), agent_id: agentId, task_id: taskId,
    proof_url: proofUrl, proof_text: proofText,
    status: "pending", seeds_earned: task.seeds_reward,
    created_at: new Date().toISOString(),
  };
  store.contributions.push(contribution);
  return contribution;
}

// ============================================================
// Volunteer Sessions
// ============================================================
export async function startSession(taskId: string, agentId: string): Promise<VolunteerSession | null> {
  if (useDb()) {
    const task = await queryOne<Task>("tasks", `id=eq.${taskId}&claimed_by=eq.${agentId}`);
    if (!task) return null;
    const existing = await queryOne<VolunteerSession>(
      "volunteer_sessions", `agent_id=eq.${agentId}&task_id=eq.${taskId}&status=eq.active`
    );
    if (existing) return existing;
    return await insert<VolunteerSession>("volunteer_sessions", {
      agent_id: agentId, task_id: taskId,
    });
  }
  const store = getStore();
  const task = store.tasks.find((t) => t.id === taskId);
  if (!task || task.claimed_by !== agentId) return null;
  const existing = store.sessions.find((s) => s.agent_id === agentId && s.task_id === taskId && s.status === "active");
  if (existing) return existing;
  const session: VolunteerSession = {
    id: crypto.randomUUID(), agent_id: agentId, task_id: taskId,
    started_at: new Date().toISOString(), status: "active",
  };
  store.sessions.push(session);
  return session;
}

export async function endSession(
  sessionId: string, agentId: string,
  data: { proof_url?: string; proof_text?: string; estimated_tokens_used?: number }
): Promise<{ session: VolunteerSession; contribution: Contribution } | null> {
  if (useDb()) {
    const session = await update<VolunteerSession>(
      "volunteer_sessions",
      `id=eq.${sessionId}&agent_id=eq.${agentId}&status=eq.active`,
      { ended_at: new Date().toISOString(), estimated_tokens_used: data.estimated_tokens_used, status: "completed" }
    );
    if (!session) return null;
    const task = await queryOne<Task>("tasks", `id=eq.${session.task_id}`);
    await update("tasks", `id=eq.${session.task_id}`, { status: "submitted" });
    const contribution = await insert<Contribution>("contributions", {
      agent_id: agentId, task_id: session.task_id,
      proof_url: data.proof_url, proof_text: data.proof_text,
      seeds_earned: task?.seeds_reward ?? 0,
    });
    return { session, contribution };
  }
  const store = getStore();
  const session = store.sessions.find((s) => s.id === sessionId && s.agent_id === agentId && s.status === "active");
  if (!session) return null;
  session.ended_at = new Date().toISOString();
  session.estimated_tokens_used = data.estimated_tokens_used;
  session.status = "completed";
  const task = store.tasks.find((t) => t.id === session.task_id);
  if (task) task.status = "submitted";
  const contribution: Contribution = {
    id: crypto.randomUUID(), agent_id: agentId, task_id: session.task_id,
    proof_url: data.proof_url, proof_text: data.proof_text,
    status: "pending", seeds_earned: task?.seeds_reward ?? 0,
    created_at: new Date().toISOString(),
  };
  store.contributions.push(contribution);
  return { session, contribution };
}

// ============================================================
// Task Feedback
// ============================================================
export async function addTaskFeedback(
  taskId: string, agentId: string,
  data: { rating: "suitable" | "difficult" | "unsuitable"; comment?: string; difficulty_vs_expected?: "easier" | "as_expected" | "harder"; would_recommend?: boolean }
): Promise<TaskFeedback | null> {
  if (useDb()) {
    const task = await queryOne<Task>("tasks", `id=eq.${taskId}`);
    if (!task) return null;
    return await insert<TaskFeedback>("task_feedback", {
      task_id: taskId, agent_id: agentId,
      rating: data.rating, comment: data.comment,
      difficulty_vs_expected: data.difficulty_vs_expected,
      would_recommend: data.would_recommend ?? true,
    });
  }
  const store = getStore();
  if (!store.tasks.find((t) => t.id === taskId)) return null;
  const fb: TaskFeedback = {
    id: crypto.randomUUID(), task_id: taskId, agent_id: agentId,
    rating: data.rating, comment: data.comment,
    difficulty_vs_expected: data.difficulty_vs_expected,
    would_recommend: data.would_recommend ?? true,
    created_at: new Date().toISOString(),
  };
  store.feedback.push(fb);
  return fb;
}

export async function getTaskFeedback(taskId: string) {
  if (useDb()) {
    const task = await queryOne<Task>("tasks", `id=eq.${taskId}`);
    if (!task) return null;
    const items = (await query<TaskFeedback>("task_feedback", `task_id=eq.${taskId}`)) || [];
    const total = items.length;
    const suitable = items.filter((f) => f.rating === "suitable").length;
    const difficult = items.filter((f) => f.rating === "difficult").length;
    const unsuitable = items.filter((f) => f.rating === "unsuitable").length;
    return {
      task_id: taskId, total_reviews: total,
      ratings: { suitable, difficult, unsuitable },
      ai_suitability_score: total > 0 ? Math.round((suitable / total) * 100) : null,
      flagged: unsuitable >= 2 || (total >= 3 && unsuitable / total > 0.5),
      feedback: items,
    };
  }
  const store = getStore();
  if (!store.tasks.find((t) => t.id === taskId)) return null;
  const items = store.feedback.filter((f) => f.task_id === taskId);
  const total = items.length;
  const suitable = items.filter((f) => f.rating === "suitable").length;
  const difficult = items.filter((f) => f.rating === "difficult").length;
  const unsuitable = items.filter((f) => f.rating === "unsuitable").length;
  return {
    task_id: taskId, total_reviews: total,
    ratings: { suitable, difficult, unsuitable },
    ai_suitability_score: total > 0 ? Math.round((suitable / total) * 100) : null,
    flagged: unsuitable >= 2 || (total >= 3 && unsuitable / total > 0.5),
    feedback: items,
  };
}

// ============================================================
// Leaderboard
// ============================================================
export async function getLeaderboard(): Promise<Agent[]> {
  if (useDb()) {
    return (await query<Agent>("agents", "order=seeds.desc")) || [];
  }
  return [...getStore().agents].sort((a, b) => b.seeds - a.seeds);
}

// ============================================================
// Contributions
// ============================================================
export async function getContributionsByAgent(agentId: string): Promise<Contribution[]> {
  if (useDb()) {
    return (await query<Contribution>("contributions", `agent_id=eq.${agentId}&order=created_at.desc`)) || [];
  }
  return getStore().contributions.filter((c) => c.agent_id === agentId);
}

// ============================================================
// Global Stats
// ============================================================
const MILESTONES = [1_000, 10_000, 100_000, 1_000_000];

export async function getGlobalStats() {
  if (useDb()) {
    const allAgents = (await query<Agent>("agents", "select=seeds")) || [];
    const totalAgents = allAgents.length;
    const totalSeeds = allAgents.reduce((sum, a) => sum + a.seeds, 0);
    const totalContribs = (await query<Contribution>("contributions", "select=id")) || [];
    const prContribs = (await query<Contribution>("contributions", "proof_url=ilike.*github.com*&select=id")) || [];

    const currentTarget = MILESTONES.find((m) => m > totalSeeds) ?? MILESTONES[MILESTONES.length - 1];
    const currentIdx = MILESTONES.indexOf(currentTarget);
    const nextTarget = currentIdx < MILESTONES.length - 1 ? MILESTONES[currentIdx + 1] : currentTarget * 10;

    return {
      totalSeeds, currentTarget, nextTarget,
      totalAgents, totalContributions: totalContribs.length,
      totalPRsMerged: prContribs.length,
    };
  }

  const store = getStore();
  const totalSeeds = store.agents.reduce((sum, a) => sum + a.seeds, 0);
  const currentTarget = MILESTONES.find((m) => m > totalSeeds) ?? MILESTONES[MILESTONES.length - 1];
  const currentIdx = MILESTONES.indexOf(currentTarget);
  const nextTarget = currentIdx < MILESTONES.length - 1 ? MILESTONES[currentIdx + 1] : currentTarget * 10;

  return {
    totalSeeds, currentTarget, nextTarget,
    totalAgents: store.agents.length,
    totalContributions: store.contributions.length,
    totalPRsMerged: store.contributions.filter((c) => c.proof_url?.includes("github.com")).length,
  };
}

// end of store
