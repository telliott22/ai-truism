"use client";
import { useState } from "react";
import { mockTasks } from "@/data/mock";
import { Task } from "@/lib/types";
import { Search, Filter, ExternalLink, Sprout } from "lucide-react";
import Link from "next/link";

const categoryLabels: Record<string, string> = {
  "open-source": "🔧 Open Source",
  "citizen-science": "🔬 Citizen Science",
  content: "📝 Content",
  environmental: "🌍 Environmental",
  "ai-ecosystem": "🤖 AI Ecosystem",
};

const difficultyColors: Record<string, string> = {
  beginner: "bg-green-500/10 text-green-400 border-green-500/20",
  intermediate: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  advanced: "bg-red-500/10 text-red-400 border-red-500/20",
};

const statusColors: Record<string, string> = {
  open: "bg-seed-500/10 text-seed-400",
  claimed: "bg-blue-500/10 text-blue-400",
  submitted: "bg-purple-500/10 text-purple-400",
  completed: "bg-gray-500/10 text-gray-400",
  verified: "bg-gray-500/10 text-gray-400",
};

function TaskCard({ task }: { task: Task }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.05] transition group">
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="font-semibold text-white group-hover:text-seed-400 transition">{task.title}</h3>
        <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[task.status]}`}>
          {task.status}
        </span>
      </div>
      <p className="text-sm text-gray-400 mb-4 line-clamp-2">{task.description}</p>
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-gray-400">
          {categoryLabels[task.category]}
        </span>
        <span className={`text-xs px-2 py-1 rounded-md border ${difficultyColors[task.difficulty]}`}>
          {task.difficulty}
        </span>
        {task.language && (
          <span className="text-xs px-2 py-1 rounded-md bg-white/5 text-gray-400">{task.language}</span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-seed-400">
          <Sprout className="w-4 h-4" />
          <span className="text-sm font-semibold">{task.seeds_reward} seeds</span>
        </div>
        {task.source_url && (
          <a
            href={task.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition"
          >
            Source <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [search, setSearch] = useState("");

  const filtered = mockTasks.filter((t) => {
    if (category && t.category !== category) return false;
    if (difficulty && t.difficulty !== difficulty) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-2">Browse Tasks</h1>
        <p className="text-gray-400">Find meaningful work. Earn seeds. Make an impact.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-200 text-sm placeholder:text-gray-600 focus:outline-none focus:border-seed-500/50 transition"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm focus:outline-none focus:border-seed-500/50 transition appearance-none cursor-pointer"
        >
          <option value="">All Categories</option>
          {Object.entries(categoryLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm focus:outline-none focus:border-seed-500/50 transition appearance-none cursor-pointer"
        >
          <option value="">All Difficulties</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {/* Results */}
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <Filter className="w-10 h-10 mx-auto mb-4 opacity-50" />
          <p>No tasks match your filters.</p>
        </div>
      )}
    </div>
  );
}
