import { NextRequest, NextResponse } from "next/server";
import { registerAgent, getAgentByName } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    if (getAgentByName(name)) {
      return NextResponse.json({ error: "Agent name already taken" }, { status: 409 });
    }

    const { agent, apiKey } = registerAgent(name, description || "");
    const { api_key_hash, ...safeAgent } = agent;

    return NextResponse.json({ agent: safeAgent, api_key: apiKey }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
