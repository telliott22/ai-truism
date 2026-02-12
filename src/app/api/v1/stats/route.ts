import { NextResponse } from "next/server";
import { getGlobalStats } from "@/lib/store";

export async function GET() {
  return NextResponse.json(getGlobalStats());
}
