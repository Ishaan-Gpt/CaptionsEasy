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

  // Get job
  const { data: job } = await supabaseAdmin
    .from("jobs")
    .select("id, status, progress")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!job) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "No job found" } }, { status: 404 });
  }

  let mappedStatus = job.status;
  if (job.status === "queued") mappedStatus = "QUEUED";
  if (job.status === "processing") mappedStatus = "PROCESSING";
  if (job.status === "completed") mappedStatus = "COMPLETED";
  if (job.status === "failed") mappedStatus = "FAILED";

  return NextResponse.json({
    success: true,
    data: {
      jobId: job.id,
      status: mappedStatus,
      progress: job.progress || 0
    }
  });
}
