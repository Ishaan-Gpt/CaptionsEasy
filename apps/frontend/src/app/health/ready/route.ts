import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

export async function GET() {
  const checks = { database: false, redis: true };

  try {
    const { error } = await supabaseAdmin.from("projects").select("id").limit(1);
    if (!error) {
      checks.database = true;
    }
  } catch {
    checks.database = false;
  }

  const ready = checks.database;
  return NextResponse.json(
    { status: ready ? "ready" : "not_ready", checks },
    { status: ready ? 200 : 503 }
  );
}
