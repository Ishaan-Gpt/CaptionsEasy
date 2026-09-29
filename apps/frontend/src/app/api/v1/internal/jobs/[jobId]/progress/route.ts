import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

async function validateWorkerToken(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  
  // Validate worker token against plaintext column
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
  const body = await req.json();
  const { percentage } = body;

  const { error } = await supabaseAdmin
    .from("jobs")
    .update({ progress: percentage, status: "processing" })
    .eq("id", jobId);

  if (error) {
    return NextResponse.json({ success: false, error: "Failed to update job" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
