import { NextRequest, NextResponse } from "next/server";
import { getTaskById } from "@/lib/store";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const task = getTaskById(params.id);
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json({ task });
}
