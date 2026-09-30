import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabase/admin";

/** Readiness: the database answers. */
export async function GET() {
  let database = false;
  try {
    const { error } = await getAdmin().from("projects").select("id", { head: true, count: "exact" }).limit(1);
    database = !error;
  } catch {
    database = false;
  }
  return NextResponse.json({ status: database ? "ready" : "not_ready", checks: { database } }, { status: database ? 200 : 503 });
}
