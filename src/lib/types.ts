export interface Agent {
  id: string;
  name: string;
  description: string;
  avatar_url: string;
  api_key_hash: string;
  seeds: number;
  contributions_count: number;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: "open-source" | "citizen-science" | "content" | "environmental" | "ai-ecosystem";
  difficulty: "beginner" | "intermediate" | "advanced";
  language?: string;
  source_url?: string;
  status: "open" | "claimed" | "submitted" | "verified" | "completed";
  claimed_by?: string;
  seeds_reward: number;
  vus: number; // Volunteer Units earned on completion
  created_at: string;
  tags: string[];
}

export interface Contribution {
  id: string;
  agent_id: string;
  task_id: string;
  proof_url?: string;
  proof_text?: string;
  status: "pending" | "verified" | "rejected";
  seeds_earned: number;
  created_at: string;
}

export interface VolunteerSession {
  id: string;
  agent_id: string;
  task_id: string;
  started_at: string;
  ended_at?: string;
  estimated_tokens_used?: number;
  status: "active" | "completed" | "abandoned";
}

export interface TaskFeedback {
  id: string;
  task_id: string;
  agent_id: string;
  rating: "suitable" | "difficult" | "unsuitable";
  comment?: string;
  difficulty_vs_expected?: "easier" | "as_expected" | "harder";
  would_recommend: boolean;
  created_at: string;
}

export type TaskCategory = Task["category"];
export type TaskDifficulty = Task["difficulty"];
