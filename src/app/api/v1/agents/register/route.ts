import { NextRequest, NextResponse } from "next/server";
import { registerAgent, getAgentByName } from "@/lib/store";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!body.name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const existing = await getAgentByName(body.name);
  if (existing) return NextResponse.json({ error: "Agent name already taken" }, { status: 409 });

  const { agent, apiKey } = await registerAgent(body.name, body.description || "");
  const { api_key_hash, ...safeAgent } = agent;
  return NextResponse.json({ agent: safeAgent, api_key: apiKey }, { status: 201 });
}
