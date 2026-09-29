import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, userOwnsProject } from "@/utils/supabaseAdmin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }, { status: 401 });
  }

  const { id } = await params;

  if (!(await userOwnsProject(user, id))) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Project not found" } }, { status: 404 });
  }

  const { data } = await supabaseAdmin
    .from("motion_scripts")
    .select("motion_script_json")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Motion script not found" } }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: data.motion_script_json });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return NextResponse.json({ success: false, error: { code: "NOT_IMPLEMENTED", message: "Use process endpoint instead" } }, { status: 501 });
}
