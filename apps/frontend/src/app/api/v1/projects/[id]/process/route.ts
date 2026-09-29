import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest } from "@/utils/supabaseAdmin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }, { status: 401 });
  }

  const { id } = await params;
  const ownerIds = [user.id, user.auth_user_id].filter(Boolean);

  // 1. Get project
  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("id", id)
    .in("owner_id", ownerIds)
    .single();

  if (!project) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Project not found" } }, { status: 404 });
  }

  // 2. Find online worker
  const { data: worker } = await supabaseAdmin
    .from("workers")
    .select("*")
    .in("owner_id", ownerIds)
    .eq("status", "online")
    .order("last_seen_at", { ascending: false })
    .limit(1)
    .single();

  if (!worker || !worker.worker_url) {
    return NextResponse.json({ success: false, error: { code: "NO_WORKER_PAIRED", message: "No computer connected. Connect your computer to process this project." } }, { status: 409 });
  }

  // 3. Get latest video
  const { data: video } = await supabaseAdmin
    .from("videos")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!video) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "No video found for this project." } }, { status: 404 });
  }

  // 4. Create new job (or update if the upload created one)
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
    return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: "Failed to create job" } }, { status: 500 });
  }

  // 5. Generate signed URL for local worker to download the video
  const { data: signedUrlData } = await supabaseAdmin
    .storage
    .from("videos")
    .createSignedUrl(video.storage_path, 3600); // 1 hour

  if (!signedUrlData) {
    return NextResponse.json({ success: false, error: { code: "STORAGE_ERROR", message: "Failed to create signed URL" } }, { status: 500 });
  }

  const protocol = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host");
  const callbackBaseUrl = `${protocol}://${host}/api/v1`;

  // 6. Dispatch to local worker
  const payload = {
    jobId: job.id,
    jobType: "ai_pipeline",
    callbackBaseUrl: callbackBaseUrl,
    videoSignedUrl: signedUrlData.signedUrl,
    style: project.style || "kalakar",
    captionTemplate: project.caption_template,
    prompt: project.title ? `Title: ${project.title}` : null,
    speechProviderName: "groq",
    creativeProviderName: "groq",
    captionProviderName: "groq",
    renderPlanProviderName: "dummy",
  };

  try {
    const response = await fetch(`${worker.worker_url.replace(/\/$/, '')}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${worker.worker_token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Worker returned ${response.status}`);
    }
  } catch (error) {
    await supabaseAdmin
      .from("workers")
      .update({ status: "offline", last_error: `Dispatch failed: ${error}` })
      .eq("id", worker.id);
      
    await supabaseAdmin
      .from("jobs")
      .update({ status: "failed", error_message: "Worker dispatch failed. Ensure your computer is connected." })
      .eq("id", job.id);

    return NextResponse.json({ success: false, error: { code: "DISPATCH_FAILED", message: "Worker dispatch failed." } }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: { jobId: job.id } });
}
