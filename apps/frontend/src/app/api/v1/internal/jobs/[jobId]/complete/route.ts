import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

async function validateWorkerToken(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  
  const { data: worker } = await supabaseAdmin
    .from("workers")
    .select("id")
    .eq("worker_token", token)
    .single();
    
  return worker;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const worker = await validateWorkerToken(req);
  if (!worker) {
    return NextResponse.json({ success: false, error: "Invalid worker token" }, { status: 401 });
  }

  const { jobId } = await params;
  const { transcript, creative_plan, caption_plan, motion_script } = await req.json();

  // 1. Get the job to find the project_id
  const { data: job } = await supabaseAdmin
    .from("jobs")
    .select("project_id")
    .eq("id", jobId)
    .single();

  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
  }

  const projectId = job.project_id;

  // 2. Insert AI pipeline outputs
  await Promise.all([
    supabaseAdmin.from("transcripts").insert({ project_id: projectId, transcript_json: transcript, language: transcript.language, provider: transcript.provider }),
    supabaseAdmin.from("creative_plans").insert({ project_id: projectId, creative_plan: creative_plan }),
    supabaseAdmin.from("caption_plans").insert({ project_id: projectId, caption_json: caption_plan }),
    supabaseAdmin.from("motion_scripts").insert({ project_id: projectId, motion_script_json: motion_script }),
  ]);

  // 3. Update job to completed
  await supabaseAdmin
    .from("jobs")
    .update({ status: "completed", progress: 100, finished_at: new Date().toISOString() })
    .eq("id", jobId);

  // 4. Update project status to ready
  await supabaseAdmin
    .from("projects")
    .update({ status: "ready", updated_at: new Date().toISOString() })
    .eq("id", projectId);

  return NextResponse.json({ success: true });
}
