import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const agents = await getLeaderboard();
  const safe = agents.map(({ api_key_hash, ...rest }: any) => rest);
  return NextResponse.json({ agents: safe });
}
