import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest } from "@/utils/supabaseAdmin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }, { status: 401 });
  }

  const { id } = await params;
  const ownerIds = [user.id, user.auth_user_id].filter(Boolean);
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("id", id)
    .in("owner_id", ownerIds)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Project not found" } }, { status: 404 });
  }

  // Fetch latest video
  const { data: video } = await supabaseAdmin
    .from("videos")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch latest transcript
  const { data: transcript } = await supabaseAdmin
    .from("transcripts")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch latest motion script
  const { data: motionScript } = await supabaseAdmin
    .from("motion_scripts")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let videoWithUrl = video;
  if (video?.storage_path) {
    const { data: signed } = await supabaseAdmin.storage
      .from("videos")
      .createSignedUrl(video.storage_path, 3600);
    videoWithUrl = {
      ...video,
      url: signed?.signedUrl || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/videos/${video.storage_path}`
    };
  }

  return NextResponse.json({
    success: true,
    data: {
      ...data,
      video: videoWithUrl,
      transcript,
      motion_script: motionScript
    }
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }, { status: 401 });
  }

  const { id } = await params;
  const ownerIds = [user.id, user.auth_user_id].filter(Boolean);
  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from("projects")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .in("owner_id", ownerIds)
    .is("deleted_at", null)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Project not found" } }, { status: 404 });
  }

  return NextResponse.json({ success: true, data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }, { status: 401 });
  }

  const { id } = await params;
  const ownerIds = [user.id, user.auth_user_id].filter(Boolean);
  const { error } = await supabaseAdmin
    .from("projects")
    .update({ deleted_at: new Date().toISOString(), status: "deleted" })
    .eq("id", id)
    .in("owner_id", ownerIds)
    .is("deleted_at", null);

  if (error) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Project not found" } }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
