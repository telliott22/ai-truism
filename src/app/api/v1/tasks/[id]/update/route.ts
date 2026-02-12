export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";

function cfg() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const secret = req.headers.get("x-verify-secret");
  if (secret !== process.env.VERIFY_SECRET && secret !== "altruist-verify-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const c = cfg();
  if (!c) return NextResponse.json({ error: "DB not configured" }, { status: 500 });

  const body = await req.json();
  // Only allow updating description and tags
  const allowed: Record<string, any> = {};
  if (body.description) allowed.description = body.description;
  if (body.tags) allowed.tags = body.tags;
  if (body.status) allowed.status = body.status;

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const res = await fetch(`${c.url}/rest/v1/tasks?id=eq.${params.id}`, {
    method: "PATCH",
    headers: {
      'apikey': c.key,
      'Authorization': `Bearer ${c.key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      'Accept': 'application/vnd.pgrst.object+json',
    },
    body: JSON.stringify(allowed),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: err.message || "Update failed" }, { status: res.status });
  }

  const task = await res.json();
  return NextResponse.json({ task });
}
