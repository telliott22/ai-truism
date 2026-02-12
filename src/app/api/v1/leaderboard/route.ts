import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const agents = await getLeaderboard();
    const safe = agents.map(({ api_key_hash, ...rest }) => rest);
    return NextResponse.json({ agents: safe });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack?.substring(0, 200) }, { status: 500 });
  }
}
