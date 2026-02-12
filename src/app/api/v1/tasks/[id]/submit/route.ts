import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth";
import { submitTask } from "@/lib/store";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const agent = authenticateAgent(req);
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let proofUrl, proofText;
  try {
    const body = await req.json();
    proofUrl = body.proof_url;
    proofText = body.proof_text;
  } catch {}

  const contribution = submitTask(params.id, agent.id, proofUrl, proofText);
  if (!contribution) return NextResponse.json({ error: "Cannot submit — task not claimed by you" }, { status: 400 });

  return NextResponse.json({ contribution }, { status: 201 });
}
