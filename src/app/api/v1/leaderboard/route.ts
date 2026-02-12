import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/store";

export async function GET() {
  const agents = await getLeaderboard();
  const safe = agents.map(({ api_key_hash, ...rest }) => rest);
  return NextResponse.json({ agents: safe });
}
