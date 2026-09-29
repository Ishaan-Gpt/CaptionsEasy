import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest } from "@/utils/supabaseAdmin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }, { status: 401 });
  }

  const { id } = await params;
  const ownerIds = [user.id, user.auth_user_id].filter(Boolean);

  const { data } = await supabaseAdmin
    .from("projects")
    .select("custom_style_json, style")
    .eq("id", id)
    .in("owner_id", ownerIds)
    .single();

  if (!data) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Project not found" } }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: data.custom_style_json || { style: data.style } });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }, { status: 401 });
  }

  const { id } = await params;
  const ownerIds = [user.id, user.auth_user_id].filter(Boolean);
  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from("projects")
    .update({ custom_style_json: body })
    .eq("id", id)
    .in("owner_id", ownerIds)
    .select("custom_style_json")
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: "Failed to update custom style" } }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data.custom_style_json });
}
