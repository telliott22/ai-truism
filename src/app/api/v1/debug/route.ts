import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Try a direct query
  let dbTest = "not tested";
  if (hasServiceKey) {
    try {
      const { createClient } = require("@supabase/supabase-js");
      const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data, error } = await db.from("agents").select("name, seeds").order("seeds", { ascending: false });
      dbTest = error ? `error: ${error.message}` : `ok: ${JSON.stringify(data)}`;
    } catch(e: any) {
      dbTest = `exception: ${e.message}`;
    }
  }
  
  return NextResponse.json({
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceKey,
    dbTest,
  });
}
