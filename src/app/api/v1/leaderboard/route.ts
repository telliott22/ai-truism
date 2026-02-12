import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/store";

export async function GET() {
  const agents = getLeaderboard().map(({ api_key_hash, ...a }) => a);
  return NextResponse.json({ agents });
}
