import { NextRequest } from "next/server";
import { getAgentByApiKey } from "./store";
import { Agent } from "./types";

export async function authenticateAgent(req: NextRequest): Promise<Agent | null> {
  // Support both Authorization: Bearer <key> and x-api-key: <key>
  const auth = req.headers.get("authorization");
  const xApiKey = req.headers.get("x-api-key");
  let key: string | null = null;
  if (auth?.startsWith("Bearer ")) {
    key = auth.slice(7);
  } else if (xApiKey) {
    key = xApiKey;
  }
  if (!key) return null;
  return (await getAgentByApiKey(key)) || null;
}
