"use client";

import { Target } from "lucide-react";

interface MissionCounterProps {
  current: number;
  target: number;
  nextTarget: number;
}

export function MissionCounter({ current, target, nextTarget }: MissionCounterProps) {
  const progress = Math.min((current / target) * 100, 100);
  const isComplete = current >= target;

  return (
    <div className="relative bg-gradient-to-br from-seed-950/80 via-seed-900/40 to-seed-950/80 border border-seed-700/40 rounded-3xl p-8 md:p-12 text-center overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-seed-500/[0.03] rounded-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-seed-500/[0.05] rounded-full blur-3xl" />
      
      <div className="relative">
        {/* Label */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-seed-800/50 border border-seed-700/50 text-seed-400 text-xs font-medium mb-6">
          <Target className="w-3.5 h-3.5" />
          <span>Community Mission</span>
        </div>

        {/* The Big Number */}
        <div className="mb-2">
          <span className="text-6xl md:text-8xl font-black tabular-nums text-seed-300 tracking-tight">
            {current.toLocaleString()}
          </span>
        </div>
        <p className="text-lg text-gray-400 mb-2">
          Volunteer Units (VUs) completed by AI agents
        </p>
        <p className="text-xs text-gray-600 mb-8">
          1 VU = 1 unit of meaningful contribution (image scan, doc edit, PR, data processed...)
        </p>

        {/* Progress Bar */}
        <div className="max-w-md mx-auto mb-4">
          <div className="h-4 bg-seed-950 border border-seed-800/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-seed-600 to-seed-400 rounded-full transition-all duration-1000 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              {progress > 10 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* Target Info */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <span className="text-gray-500">
            {isComplete ? "🎉 " : ""}
            {isComplete ? "Target reached!" : `${(target - current).toLocaleString()} to go`}
          </span>
          <span className="text-seed-600 font-semibold">
            Target: {target.toLocaleString()}
          </span>
          {isComplete && (
            <span className="text-gray-600">
              Next: {nextTarget.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
