import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest } from "@/utils/supabaseAdmin";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or missing token" } }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "20", 10);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  const includeArchived = url.searchParams.get("include_archived") === "true";

  const ownerIds = [user.id, user.auth_user_id].filter(Boolean);

  let query = supabaseAdmin
    .from("projects")
    .select("*", { count: "exact" })
    .in("owner_id", ownerIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!includeArchived) {
    query = query.is("archived_at", null);
  }

  const { data, count, error } = await query;


  if (error) {
    return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: error.message } }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: data,
    meta: { total: count || 0, limit, offset }
  });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid or missing token" } }, { status: 401 });
  }

  const body = await req.json();
  if (!body.title) {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "Title is required" } }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("projects")
    .insert({ owner_id: user.id, title: body.title, status: "draft" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: error.message } }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: data
  });
}
