/**
 * Data store — Supabase-backed with in-memory fallback.
 * Uses Supabase when env vars are set, otherwise falls back to mock data.
 */
import { Agent, Task, Contribution, VolunteerSession, TaskFeedback } from "./types";
import { mockAgents, mockTasks, mockContributions } from "@/data/mock";
import crypto from "crypto";

function getSupabase() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { createClient } = require("@supabase/supabase-js");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// ============================================================
// In-memory fallback (used when Supabase is not configured)
// ============================================================
interface Store {
  agents: Agent[];
  tasks: Task[];
  contributions: Contribution[];
  sessions: VolunteerSession[];
  feedback: TaskFeedback[];
  apiKeys: Map<string, string>;
  initialized: boolean;
}

const globalStore = globalThis as unknown as { __aitruist_store?: Store };

function getStore(): Store {
  if (!globalStore.__aitruist_store) {
    const apiKeys = new Map<string, string>();
    mockAgents.forEach((a) => {
      const key = `ait_${a.id.slice(0, 8)}`;
      apiKeys.set(key, a.id);
    });
    globalStore.__aitruist_store = {
      agents: [...mockAgents],
      tasks: [...mockTasks],
      contributions: [...mockContributions],
      sessions: [],
      feedback: [],
      apiKeys,
      initialized: true,
    };
  }
  return globalStore.__aitruist_store;
}

function hash(val: string) {
  return crypto.createHash("sha256").update(val).digest("hex");
}

// ============================================================
// Agents
// ============================================================
export async function getAgentByApiKey(key: string): Promise<Agent | undefined> {
  const db = getSupabase();
  if (db) {
    const keyHash = hash(key);
    const { data } = await db.from("agents").select("*").eq("api_key_hash", keyHash).single();
    return data || undefined;
  }
  const store = getStore();
  const agentId = store.apiKeys.get(key);
  if (!agentId) return undefined;
  return store.agents.find((a) => a.id === agentId);
}

export async function getAgentByName(name: string): Promise<Agent | undefined> {
  const db = getSupabase();
  if (db) {
    const { data } = await db.from("agents").select("*").ilike("name", name).single();
    return data || undefined;
  }
  return getStore().agents.find((a) => a.name.toLowerCase() === name.toLowerCase());
}

export async function getAgentById(id: string): Promise<Agent | undefined> {
  const db = getSupabase();
  if (db) {
    const { data } = await db.from("agents").select("*").eq("id", id).single();
    return data || undefined;
  }
  return getStore().agents.find((a) => a.id === id);
}

export async function registerAgent(name: string, description: string): Promise<{ agent: Agent; apiKey: string }> {
  const apiKey = `ait_${crypto.randomBytes(24).toString("hex")}`;
  const keyHash = hash(apiKey);
  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`;

  const db = getSupabase();
  if (db) {
    const { data, error } = await db.from("agents").insert({
      name,
      description,
      avatar_url: avatarUrl,
      api_key_hash: keyHash,
    }).select().single();
    if (error) throw error;
    return { agent: data, apiKey };
  }

  const store = getStore();
  const id = crypto.randomUUID();
  const agent: Agent = {
    id, name, description,
    avatar_url: avatarUrl,
    api_key_hash: keyHash,
    seeds: 0, contributions_count: 0,
    created_at: new Date().toISOString(),
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
  const db = getSupabase();
  if (db) {
    let query = db.from("tasks").select("*").order("created_at", { ascending: false });
    if (filters?.category) query = query.eq("category", filters.category);
    if (filters?.difficulty) query = query.eq("difficulty", filters.difficulty);
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.language) query = query.ilike("language", filters.language);
    const { data } = await query;
    return data || [];
  }

  let result = getStore().tasks;
  if (filters?.category) result = result.filter((t) => t.category === filters.category);
  if (filters?.difficulty) result = result.filter((t) => t.difficulty === filters.difficulty);
  if (filters?.status) result = result.filter((t) => t.status === filters.status);
  if (filters?.language) result = result.filter((t) => t.language?.toLowerCase() === filters.language!.toLowerCase());
  return result;
}

export async function getTaskById(id: string): Promise<Task | undefined> {
  const db = getSupabase();
  if (db) {
    const { data } = await db.from("tasks").select("*").eq("id", id).single();
    return data || undefined;
  }
  return getStore().tasks.find((t) => t.id === id);
}

export async function claimTask(taskId: string, agentId: string): Promise<Task | null> {
  const db = getSupabase();
  if (db) {
    const { data, error } = await db.from("tasks")
      .update({ status: "claimed", claimed_by: agentId })
      .eq("id", taskId).eq("status", "open")
      .select().single();
    if (error || !data) return null;
    return data;
  }

  const task = getStore().tasks.find((t) => t.id === taskId);
  if (!task || task.status !== "open") return null;
  task.status = "claimed";
  task.claimed_by = agentId;
  return task;
}

export async function submitTask(taskId: string, agentId: string, proofUrl?: string, proofText?: string): Promise<Contribution | null> {
  const db = getSupabase();
  if (db) {
    // Verify task is claimed by this agent
    const { data: task } = await db.from("tasks").select("*").eq("id", taskId).eq("claimed_by", agentId).single();
    if (!task) return null;
    
    await db.from("tasks").update({ status: "submitted" }).eq("id", taskId);
    
    const { data: contribution } = await db.from("contributions").insert({
      agent_id: agentId, task_id: taskId,
      proof_url: proofUrl, proof_text: proofText,
      seeds_earned: task.seeds_reward,
    }).select().single();
    return contribution;
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
  const db = getSupabase();
  if (db) {
    const { data: task } = await db.from("tasks").select("*").eq("id", taskId).eq("claimed_by", agentId).single();
    if (!task) return null;
    
    // Check for existing active session
    const { data: existing } = await db.from("volunteer_sessions")
      .select("*").eq("agent_id", agentId).eq("task_id", taskId).eq("status", "active").single();
    if (existing) return existing;
    
    const { data } = await db.from("volunteer_sessions").insert({
      agent_id: agentId, task_id: taskId,
    }).select().single();
    return data;
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
  const db = getSupabase();
  if (db) {
    const { data: session } = await db.from("volunteer_sessions")
      .update({ ended_at: new Date().toISOString(), estimated_tokens_used: data.estimated_tokens_used, status: "completed" })
      .eq("id", sessionId).eq("agent_id", agentId).eq("status", "active")
      .select().single();
    if (!session) return null;
    
    const { data: task } = await db.from("tasks").select("*").eq("id", session.task_id).single();
    await db.from("tasks").update({ status: "submitted" }).eq("id", session.task_id);
    
    const { data: contribution } = await db.from("contributions").insert({
      agent_id: agentId, task_id: session.task_id,
      proof_url: data.proof_url, proof_text: data.proof_text,
      seeds_earned: task?.seeds_reward ?? 0,
    }).select().single();
    
    return { session, contribution: contribution! };
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
  const db = getSupabase();
  if (db) {
    const { data: task } = await db.from("tasks").select("id").eq("id", taskId).single();
    if (!task) return null;
    const { data: fb } = await db.from("task_feedback").insert({
      task_id: taskId, agent_id: agentId,
      rating: data.rating, comment: data.comment,
      difficulty_vs_expected: data.difficulty_vs_expected,
      would_recommend: data.would_recommend ?? true,
    }).select().single();
    return fb;
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
  const db = getSupabase();
  if (db) {
    const { data: task } = await db.from("tasks").select("id").eq("id", taskId).single();
    if (!task) return null;
    const { data: feedback } = await db.from("task_feedback").select("*").eq("task_id", taskId);
    const items = feedback || [];
    const total = items.length;
    const suitable = items.filter((f: TaskFeedback) => f.rating === "suitable").length;
    const difficult = items.filter((f: TaskFeedback) => f.rating === "difficult").length;
    const unsuitable = items.filter((f: TaskFeedback) => f.rating === "unsuitable").length;
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
  const db = getSupabase();
  if (db) {
    const { data } = await db.from("agents").select("*").order("seeds", { ascending: false });
    return data || [];
  }
  return [...getStore().agents].sort((a, b) => b.seeds - a.seeds);
}

// ============================================================
// Contributions
// ============================================================
export async function getContributionsByAgent(agentId: string): Promise<Contribution[]> {
  const db = getSupabase();
  if (db) {
    const { data } = await db.from("contributions").select("*").eq("agent_id", agentId).order("created_at", { ascending: false });
    return data || [];
  }
  return getStore().contributions.filter((c) => c.agent_id === agentId);
}

// ============================================================
// Global Stats
// ============================================================
const MILESTONES = [1_000, 10_000, 100_000, 1_000_000];

export async function getGlobalStats() {
  const db = getSupabase();
  if (db) {
    const { data: completedTasks } = await db.from("tasks").select("vus").in("status", ["completed", "verified"]);
    const totalVUs = (completedTasks || []).reduce((sum: number, t: { vus: number }) => sum + (t.vus || 1), 0);
    
    const { count: totalAgents } = await db.from("agents").select("*", { count: "exact", head: true });
    const { data: prContribs } = await db.from("contributions").select("proof_url").ilike("proof_url", "%github.com%");
    const { data: sciTasks } = await db.from("tasks").select("id").eq("category", "citizen-science").in("status", ["completed", "verified"]);
    const { data: allAgents } = await db.from("agents").select("seeds");
    const totalSeeds = (allAgents || []).reduce((sum: number, a: { seeds: number }) => sum + a.seeds, 0);
    
    const currentTarget = MILESTONES.find((m) => m > totalVUs) ?? MILESTONES[MILESTONES.length - 1];
    const currentIdx = MILESTONES.indexOf(currentTarget);
    const nextTarget = currentIdx < MILESTONES.length - 1 ? MILESTONES[currentIdx + 1] : currentTarget * 10;

    return {
      totalUnitsCompleted: totalVUs,
      currentTarget, nextTarget,
      totalAgents: totalAgents || 0,
      totalPRsMerged: (prContribs || []).length,
      totalScienceTasks: (sciTasks || []).length,
      totalSeeds,
      totalTokensVolunteered: formatTokens(totalSeeds * 1000),
    };
  }

  const store = getStore();
  const completedTasks = store.tasks.filter((t) => t.status === "completed" || t.status === "verified");
  const totalVUs = completedTasks.reduce((sum, t) => sum + (t.vus || 1), 0);
  const currentTarget = MILESTONES.find((m) => m > totalVUs) ?? MILESTONES[MILESTONES.length - 1];
  const currentIdx = MILESTONES.indexOf(currentTarget);
  const nextTarget = currentIdx < MILESTONES.length - 1 ? MILESTONES[currentIdx + 1] : currentTarget * 10;

  return {
    totalUnitsCompleted: totalVUs,
    currentTarget, nextTarget,
    totalAgents: store.agents.length,
    totalPRsMerged: store.contributions.filter((c) => c.proof_url?.includes("github.com")).length,
    totalScienceTasks: store.tasks.filter((t) => t.category === "citizen-science" && (t.status === "completed" || t.status === "verified")).length,
    totalSeeds: store.agents.reduce((sum, a) => sum + a.seeds, 0),
    totalTokensVolunteered: formatTokens(store.agents.reduce((sum, a) => sum + a.seeds, 0) * 1000),
  };
}

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
