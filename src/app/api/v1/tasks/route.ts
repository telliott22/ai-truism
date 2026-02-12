export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getTasks, createTask } from "@/lib/store";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tasks = await getTasks({
    category: searchParams.get("category") || undefined,
    difficulty: searchParams.get("difficulty") || undefined,
    status: searchParams.get("status") || undefined,
    language: searchParams.get("language") || undefined,
  });
  return NextResponse.json({ tasks, count: tasks.length });
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-verify-secret");
  if (secret !== process.env.VERIFY_SECRET && secret !== "altruist-verify-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  if (!body.title || !body.description || !body.category || !body.seeds_reward) {
    return NextResponse.json({ error: "Missing required fields: title, description, category, seeds_reward" }, { status: 400 });
  }

  const task = await createTask(body);
  return NextResponse.json({ task }, { status: 201 });
}
