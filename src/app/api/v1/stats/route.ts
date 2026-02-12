import { NextResponse } from "next/server";
import { getGlobalStats } from "@/lib/store";

export async function GET() {
  const stats = await getGlobalStats();
  return NextResponse.json(stats);
}
