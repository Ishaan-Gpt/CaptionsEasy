import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest } from "@/utils/supabaseAdmin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }, { status: 401 });
  }

  const { id } = await params;

  // Get video
  const { data: video } = await supabaseAdmin
    .from("videos")
    .select("storage_path")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!video) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Video not found" } }, { status: 404 });
  }

  // Generate signed URL
  const { data: urlData } = await supabaseAdmin
    .storage
    .from("videos")
    .createSignedUrl(video.storage_path, 3600);

  if (!urlData) {
    return NextResponse.json({ success: false, error: { code: "STORAGE_ERROR", message: "Failed to generate video URL" } }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: { download_url: urlData.signedUrl } });
}
