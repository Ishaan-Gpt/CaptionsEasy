import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest } from "@/utils/supabaseAdmin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }, { status: 401 });
  }

  const { id } = await params;
  const ownerIds = [user.id, user.auth_user_id].filter(Boolean);

  // Get original
  const { data: original } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("id", id)
    .in("owner_id", ownerIds)
    .single();

  if (!original) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Project not found" } }, { status: 404 });
  }

  // Insert duplicate
  const { data, error } = await supabaseAdmin
    .from("projects")
    .insert({
      owner_id: user.id,
      title: `${original.title} (Copy)`,
      description: original.description,
      status: "draft",
      style: original.style,
      caption_template: original.caption_template,
      language: original.language,
      aspect_ratio: original.aspect_ratio,
      custom_style_json: original.custom_style_json
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: "Failed to duplicate" } }, { status: 500 });
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}
