import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    return NextResponse.json({ error: "missing env" });
  }
  
  // Use raw fetch to Supabase REST API
  const res = await fetch(`${url}/rest/v1/agents?select=id,name,description,avatar_url,seeds,contributions_count,created_at,updated_at&order=seeds.desc`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    },
  });
  
  const data = await res.json();
  return NextResponse.json({ agents: data, _status: res.status });
}
