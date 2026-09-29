import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest } from "@/utils/supabaseAdmin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }, { status: 401 });
  }

  const { id } = await params;
  const ownerIds = [user.id, user.auth_user_id].filter(Boolean);

  // Verify project ownership
  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id")
    .eq("id", id)
    .in("owner_id", ownerIds)
    .single();

  if (!project) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Project not found" } }, { status: 404 });
  }

  // Create a DB Video record
  const { data: video, error: videoError } = await supabaseAdmin
    .from("videos")
    .insert({
      project_id: id,
      storage_path: `projects/${id}/video.mp4`,
    })
    .select()
    .single();

  if (videoError || !video) {
    return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: videoError?.message || "Failed to create video record" } }, { status: 500 });
  }

  // Create a DB Job record
  const { data: job, error: jobError } = await supabaseAdmin
    .from("jobs")
    .insert({
      project_id: id,
      job_type: "ai_pipeline",
      status: "queued"
    })
    .select()
    .single();

  if (jobError || !job) {
    return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: jobError?.message || "Failed to create job record" } }, { status: 500 });
  }

  // Create a signed upload URL valid for 1 hour
  const { data: signedUrlData, error: uploadError } = await supabaseAdmin
    .storage
    .from("videos")
    .createSignedUploadUrl(video.storage_path, { upsert: true });

  if (uploadError || !signedUrlData) {
    return NextResponse.json({ success: false, error: { code: "STORAGE_ERROR", message: uploadError?.message || "Failed to create signed upload URL" } }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: {
      uploadUrl: signedUrlData.signedUrl,
      videoId: video.id,
      jobId: job.id
    }
  });
}
