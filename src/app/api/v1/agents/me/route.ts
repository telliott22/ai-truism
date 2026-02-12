import { NextRequest, NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/auth";
import { getContributionsByAgent } from "@/lib/store";

export async function GET(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contributions = await getContributionsByAgent(agent.id);
  const { api_key_hash, ...safeAgent } = agent;
  return NextResponse.json({ agent: safeAgent, contributions });
}
