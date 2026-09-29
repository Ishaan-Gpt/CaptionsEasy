import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest } from "@/utils/supabaseAdmin";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }, { status: 401 });
  }

  const ownerIds = [user.id, user.auth_user_id].filter(Boolean);
  const { data, error } = await supabaseAdmin
    .from("workers")
    .select("id, name, status, last_seen_at, last_error")
    .in("owner_id", ownerIds)
    .order("last_seen_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: "Failed to fetch workers" } }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data });
}
