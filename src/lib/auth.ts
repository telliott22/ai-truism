import { NextRequest } from "next/server";
import { getAgentByApiKey } from "./store";
import { Agent } from "./types";

export async function authenticateAgent(req: NextRequest): Promise<Agent | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const key = auth.slice(7);
  return (await getAgentByApiKey(key)) || null;
}
