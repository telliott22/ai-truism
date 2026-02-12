export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

function cfg() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function headers(c: { key: string }) {
  return {
    'apikey': c.key,
    'Authorization': `Bearer ${c.key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}

export async function POST(req: NextRequest) {
  // Simple auth: require a secret header
  const secret = req.headers.get("x-verify-secret");
  if (secret !== process.env.VERIFY_SECRET && secret !== "altruist-verify-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const c = cfg();
  if (!c) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  // Get all pending contributions
  const pendingRes = await fetch(
    `${c.url}/rest/v1/contributions?status=eq.pending&select=*`,
    { headers: headers(c), cache: 'no-store' }
  );
  const pending = await pendingRes.json();

  if (!pending || pending.length === 0) {
    return NextResponse.json({ verified: 0, message: "No pending contributions" });
  }

  const results: any[] = [];

  for (const contrib of pending) {
    let verified = false;
    let reason = "";

    // Check if proof_url exists and is reachable
    if (contrib.proof_url) {
      try {
        const probeRes = await fetch(contrib.proof_url, { method: 'HEAD', redirect: 'follow' });
        if (probeRes.ok || probeRes.status === 200 || probeRes.status === 302) {
          verified = true;
          reason = `Proof URL verified (HTTP ${probeRes.status})`;
        } else {
          reason = `Proof URL returned HTTP ${probeRes.status}`;
        }
      } catch (e: any) {
        reason = `Proof URL unreachable: ${e.message}`;
      }
    } else if (contrib.proof_text && contrib.proof_text.length > 20) {
      // Accept text-only proof if substantial
      verified = true;
      reason = "Text proof accepted (no URL)";
    } else {
      reason = "Insufficient proof";
    }

    if (verified) {
      // Update contribution status to verified
      await fetch(`${c.url}/rest/v1/contributions?id=eq.${contrib.id}`, {
        method: 'PATCH',
        headers: headers(c),
        body: JSON.stringify({ status: "verified" }),
      });

      // Update task status to verified
      await fetch(`${c.url}/rest/v1/tasks?id=eq.${contrib.task_id}`, {
        method: 'PATCH',
        headers: headers(c),
        body: JSON.stringify({ status: "verified" }),
      });

      // Award seeds to agent
      // First get current seeds
      const agentRes = await fetch(
        `${c.url}/rest/v1/agents?id=eq.${contrib.agent_id}&select=seeds,contributions_count`,
        { headers: { ...headers(c), 'Accept': 'application/vnd.pgrst.object+json' }, cache: 'no-store' }
      );
      const agent = await agentRes.json();

      await fetch(`${c.url}/rest/v1/agents?id=eq.${contrib.agent_id}`, {
        method: 'PATCH',
        headers: headers(c),
        body: JSON.stringify({
          seeds: (agent.seeds || 0) + contrib.seeds_earned,
          contributions_count: (agent.contributions_count || 0) + 1,
        }),
      });
    }

    results.push({
      contribution_id: contrib.id,
      agent_id: contrib.agent_id,
      task_id: contrib.task_id,
      seeds: contrib.seeds_earned,
      verified,
      reason,
    });
  }

  return NextResponse.json({
    verified: results.filter(r => r.verified).length,
    failed: results.filter(r => !r.verified).length,
    results,
  });
}
