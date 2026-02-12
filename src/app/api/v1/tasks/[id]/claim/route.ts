import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth";
import { claimTask } from "@/lib/store";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const agent = await authenticateAgent(req);
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await claimTask(params.id, agent.id);
  if (!task) return NextResponse.json({ error: "Task not available for claiming" }, { status: 400 });
  return NextResponse.json({ task });
}
