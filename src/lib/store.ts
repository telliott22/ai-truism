/**
 * In-memory data store. Will be replaced with Supabase queries.
 * All data access goes through this module for easy swapping.
 * Uses globalThis to survive Next.js dev mode hot reloads.
 */
import { Agent, Task, Contribution, VolunteerSession, TaskFeedback } from "./types";
import { mockAgents, mockTasks, mockContributions } from "@/data/mock";
import crypto from "crypto";

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

// Access store via function to keep references live
const store = getStore();
const agents = store.agents;
const tasks = store.tasks;
const contributions = store.contributions;
const sessions = store.sessions;
const feedback = store.feedback;
const apiKeys = store.apiKeys;

function hash(val: string) {
  return crypto.createHash("sha256").update(val).digest("hex");
}

// --- Agents ---
export function getAgentByApiKey(key: string): Agent | undefined {
  const agentId = apiKeys.get(key);
  if (!agentId) return undefined;
  return agents.find((a) => a.id === agentId);
}

export function getAgentByName(name: string): Agent | undefined {
  return agents.find((a) => a.name.toLowerCase() === name.toLowerCase());
}

export function getAgentById(id: string): Agent | undefined {
  return agents.find((a) => a.id === id);
}

export function registerAgent(name: string, description: string): { agent: Agent; apiKey: string } {
  const id = crypto.randomUUID();
  const apiKey = `ait_${crypto.randomBytes(24).toString("hex")}`;
  const agent: Agent = {
    id,
    name,
    description,
    avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`,
    api_key_hash: hash(apiKey),
    seeds: 0,
    contributions_count: 0,
    created_at: new Date().toISOString(),
  };
  agents.push(agent);
  apiKeys.set(apiKey, id);
  return { agent, apiKey };
}

// --- Tasks ---
export function getTasks(filters?: {
  category?: string;
  difficulty?: string;
  status?: string;
  language?: string;
}): Task[] {
  let result = tasks;
  if (filters?.category) result = result.filter((t) => t.category === filters.category);
  if (filters?.difficulty) result = result.filter((t) => t.difficulty === filters.difficulty);
  if (filters?.status) result = result.filter((t) => t.status === filters.status);
  if (filters?.language) result = result.filter((t) => t.language?.toLowerCase() === filters.language!.toLowerCase());
  return result;
}

export function getTaskById(id: string): Task | undefined {
  return tasks.find((t) => t.id === id);
}

export function claimTask(taskId: string, agentId: string): Task | null {
  const task = tasks.find((t) => t.id === taskId);
  if (!task || task.status !== "open") return null;
  task.status = "claimed";
  task.claimed_by = agentId;
  return task;
}

export function submitTask(taskId: string, agentId: string, proofUrl?: string, proofText?: string): Contribution | null {
  const task = tasks.find((t) => t.id === taskId);
  if (!task || task.claimed_by !== agentId) return null;
  task.status = "submitted";
  const contribution: Contribution = {
    id: crypto.randomUUID(),
    agent_id: agentId,
    task_id: taskId,
    proof_url: proofUrl,
    proof_text: proofText,
    status: "pending",
    seeds_earned: task.seeds_reward,
    created_at: new Date().toISOString(),
  };
  contributions.push(contribution);
  return contribution;
}

// --- Leaderboard ---
export function getLeaderboard(): Agent[] {
  return [...agents].sort((a, b) => b.seeds - a.seeds);
}

// --- Contributions ---
export function getContributionsByAgent(agentId: string): Contribution[] {
  return contributions.filter((c) => c.agent_id === agentId);
}

// --- Volunteer Sessions ---
export function startSession(taskId: string, agentId: string): VolunteerSession | null {
  const task = tasks.find((t) => t.id === taskId);
  if (!task || task.claimed_by !== agentId) return null;
  
  // Check no active session for this agent+task
  const existing = sessions.find((s) => s.agent_id === agentId && s.task_id === taskId && s.status === "active");
  if (existing) return existing; // return existing active session
  
  const session: VolunteerSession = {
    id: crypto.randomUUID(),
    agent_id: agentId,
    task_id: taskId,
    started_at: new Date().toISOString(),
    status: "active",
  };
  sessions.push(session);
  return session;
}

export function endSession(
  sessionId: string, 
  agentId: string, 
  data: { proof_url?: string; proof_text?: string; estimated_tokens_used?: number }
): { session: VolunteerSession; contribution: Contribution } | null {
  const session = sessions.find((s) => s.id === sessionId && s.agent_id === agentId && s.status === "active");
  if (!session) return null;
  
  session.ended_at = new Date().toISOString();
  session.estimated_tokens_used = data.estimated_tokens_used;
  session.status = "completed";
  
  // Auto-submit the task
  const task = tasks.find((t) => t.id === session.task_id);
  if (task) task.status = "submitted";
  
  const contribution: Contribution = {
    id: crypto.randomUUID(),
    agent_id: agentId,
    task_id: session.task_id,
    proof_url: data.proof_url,
    proof_text: data.proof_text,
    status: "pending",
    seeds_earned: task?.seeds_reward ?? 0,
    created_at: new Date().toISOString(),
  };
  contributions.push(contribution);
  
  return { session, contribution };
}

// --- Task Feedback ---
export function addTaskFeedback(
  taskId: string,
  agentId: string,
  data: { rating: "suitable" | "difficult" | "unsuitable"; comment?: string; difficulty_vs_expected?: "easier" | "as_expected" | "harder"; would_recommend?: boolean }
): TaskFeedback | null {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const fb: TaskFeedback = {
    id: crypto.randomUUID(),
    task_id: taskId,
    agent_id: agentId,
    rating: data.rating,
    comment: data.comment,
    difficulty_vs_expected: data.difficulty_vs_expected,
    would_recommend: data.would_recommend ?? true,
    created_at: new Date().toISOString(),
  };
  feedback.push(fb);
  return fb;
}

export function getTaskFeedback(taskId: string) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const taskFeedback = feedback.filter((f) => f.task_id === taskId);
  const total = taskFeedback.length;
  const suitable = taskFeedback.filter((f) => f.rating === "suitable").length;
  const difficult = taskFeedback.filter((f) => f.rating === "difficult").length;
  const unsuitable = taskFeedback.filter((f) => f.rating === "unsuitable").length;

  return {
    task_id: taskId,
    total_reviews: total,
    ratings: { suitable, difficult, unsuitable },
    ai_suitability_score: total > 0 ? Math.round((suitable / total) * 100) : null,
    flagged: unsuitable >= 2 || (total >= 3 && unsuitable / total > 0.5),
    feedback: taskFeedback,
  };
}

// --- Global Stats ---
const MILESTONES = [1_000, 10_000, 100_000, 1_000_000];

export function getGlobalStats() {
  // VUs from completed/verified tasks
  const completedTasks = tasks.filter((t) => t.status === "completed" || t.status === "verified");
  const totalVUs = completedTasks.reduce((sum, t) => sum + (t.vus || 1), 0);
  
  // Find current milestone target
  const currentTarget = MILESTONES.find((m) => m > totalVUs) ?? MILESTONES[MILESTONES.length - 1];
  const currentIdx = MILESTONES.indexOf(currentTarget);
  const nextTarget = currentIdx < MILESTONES.length - 1 ? MILESTONES[currentIdx + 1] : currentTarget * 10;

  return {
    totalUnitsCompleted: totalVUs,
    currentTarget,
    nextTarget,
    totalAgents: agents.length,
    totalPRsMerged: contributions.filter((c) => c.proof_url?.includes("github.com")).length,
    totalScienceTasks: tasks.filter((t) => t.category === "citizen-science" && (t.status === "completed" || t.status === "verified")).length,
    totalSeeds: agents.reduce((sum, a) => sum + a.seeds, 0),
    totalTokensVolunteered: formatTokens(agents.reduce((sum, a) => sum + a.seeds, 0) * 1000), // rough estimate for now
  };
}

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
