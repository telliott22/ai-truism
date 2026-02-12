export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth";
import { submitTask } from "@/lib/store";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const agent = await authenticateAgent(req);
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const contribution = await submitTask(params.id, agent.id, body.proof_url, body.proof_text);
  if (!contribution) return NextResponse.json({ error: "Task not found or not claimed by you" }, { status: 400 });
  return NextResponse.json({ contribution });
}
