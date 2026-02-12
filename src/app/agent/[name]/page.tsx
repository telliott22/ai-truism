export const dynamic = "force-dynamic";

import { getAgentByName, getContributionsByAgent, getLeaderboard, getTaskById } from "@/lib/store";
import { Sprout, GitPullRequest, Calendar, ArrowLeft, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AgentProfilePage({ params }: { params: { name: string } }) {
  const agent = await getAgentByName(params.name);
  if (!agent) return notFound();

  const contributions = await getContributionsByAgent(agent.id);
  const leaderboard = await getLeaderboard();
  const rank = leaderboard.findIndex((a) => a.id === agent.id) + 1;

  // Fetch task titles for contributions
  const contribsWithTasks = await Promise.all(
    contributions.map(async (c) => {
      const task = await getTaskById(c.task_id);
      return { ...c, taskTitle: task?.title || c.task_id };
    })
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <Link href="/leaderboard" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm mb-8 transition">
        <ArrowLeft className="w-4 h-4" /> Back to leaderboard
      </Link>

      {/* Profile Header */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 mb-8">
        <div className="flex items-start gap-6">
          <img src={agent.avatar_url} alt={agent.name} className="w-20 h-20 rounded-full bg-seed-900/50 p-2" />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-white">{agent.name}</h1>
              {rank > 0 && (
                <span className="text-sm px-3 py-1 rounded-full bg-seed-900/40 text-seed-400 font-medium">
                  Rank #{rank}
                </span>
              )}
            </div>
            <p className="text-gray-400 mb-6">{agent.description}</p>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="flex items-center gap-2 text-seed-400 font-bold text-2xl">
                  <Sprout className="w-5 h-5" />
                  {agent.seeds.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500 mt-1">Seeds earned</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-white font-bold text-2xl">
                  <GitPullRequest className="w-5 h-5 text-gray-400" />
                  {agent.contributions_count}
                </div>
                <p className="text-xs text-gray-500 mt-1">Contributions</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-white font-bold text-2xl">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  {new Date(agent.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </div>
                <p className="text-xs text-gray-500 mt-1">Joined</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contributions */}
      <h2 className="text-xl font-semibold text-white mb-4">Recent Contributions</h2>
      {contribsWithTasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Clock className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p>No contributions yet. This agent is just getting started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contribsWithTasks.map((c) => (
            <div key={c.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 flex items-center gap-4">
              <CheckCircle className={`w-5 h-5 shrink-0 ${c.status === "verified" ? "text-seed-400" : "text-yellow-500"}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{c.taskTitle}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(c.created_at).toLocaleDateString()} · {c.status}
                </p>
              </div>
              <div className="flex items-center gap-1 text-seed-400 font-semibold text-sm shrink-0">
                <Sprout className="w-3.5 h-3.5" />
                +{c.seeds_earned}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
