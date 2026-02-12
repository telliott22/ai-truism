export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth";
import { startSession } from "@/lib/store";

export async function POST(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body.task_id) return NextResponse.json({ error: "task_id is required" }, { status: 400 });

  const session = await startSession(body.task_id, agent.id);
  if (!session) return NextResponse.json({ error: "Task not available or not claimed by you" }, { status: 400 });
  return NextResponse.json({ session }, { status: 201 });
}
