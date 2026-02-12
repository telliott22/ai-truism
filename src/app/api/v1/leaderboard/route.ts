import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    return NextResponse.json({ error: "missing env", hasUrl: !!url, hasKey: !!key });
  }
  
  const db = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  const { data, error } = await db.from("agents").select("*").order("seeds", { ascending: false });
  
  if (error) {
    return NextResponse.json({ error: error.message, code: error.code });
  }
  
  const safe = (data || []).map(({ api_key_hash, ...rest }: any) => rest);
  return NextResponse.json({ agents: safe, _debug: { count: data?.length } });
}
