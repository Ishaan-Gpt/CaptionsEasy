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
  const { exportPath } = await req.json();

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

  // 2. Insert Export record
  await supabaseAdmin
    .from("exports")
    .insert({
      project_id: projectId,
      storage_path: exportPath,
      status: "completed"
    });

  // 3. Update job to completed
  await supabaseAdmin
    .from("jobs")
    .update({ status: "completed", progress: 100, finished_at: new Date().toISOString() })
    .eq("id", jobId);

  return NextResponse.json({ success: true });
}
