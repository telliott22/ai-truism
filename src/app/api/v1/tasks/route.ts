import { NextRequest, NextResponse } from "next/server";
import { getTasks } from "@/lib/store";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tasks = getTasks({
    category: searchParams.get("category") || undefined,
    difficulty: searchParams.get("difficulty") || undefined,
    status: searchParams.get("status") || undefined,
    language: searchParams.get("language") || undefined,
  });

  return NextResponse.json({ tasks, count: tasks.length });
}
