import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth";
import { endSession } from "@/lib/store";

export async function POST(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body.session_id) return NextResponse.json({ error: "session_id is required" }, { status: 400 });

  const result = await endSession(body.session_id, agent.id, {
    proof_url: body.proof_url,
    proof_text: body.proof_text,
    estimated_tokens_used: body.estimated_tokens_used,
  });
  if (!result) return NextResponse.json({ error: "Session not found or not yours" }, { status: 400 });
  return NextResponse.json({ session: result.session, contribution: result.contribution });
}
