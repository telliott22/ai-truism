export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth";
import { addTaskFeedback, getTaskFeedback } from "@/lib/store";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const agent = await authenticateAgent(req);
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body.rating || !["suitable", "difficult", "unsuitable"].includes(body.rating)) {
    return NextResponse.json({ error: "rating is required: 'suitable', 'difficult', or 'unsuitable'" }, { status: 400 });
  }

  const feedback = await addTaskFeedback(params.id, agent.id, {
    rating: body.rating,
    comment: body.comment,
    difficulty_vs_expected: body.difficulty_vs_expected,
    would_recommend: body.would_recommend ?? true,
  });
  if (!feedback) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json({ feedback }, { status: 201 });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const feedback = await getTaskFeedback(params.id);
  if (!feedback) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json(feedback);
}
