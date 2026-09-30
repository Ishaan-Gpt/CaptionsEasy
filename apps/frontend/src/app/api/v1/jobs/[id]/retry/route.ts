import { requireUser } from "@/lib/api/auth";
import { ApiFailure, notFound, ok, route, type Ctx } from "@/lib/api/http";
import { logJobEvent, setProjectStatus } from "@/lib/api/jobs";
import { after } from "next/server";
import { markCloudRunning, runCloudTranscribe } from "@/lib/api/cloudAsr";
import { getAdmin } from "@/lib/supabase/admin";

export const maxDuration = 300;

export const POST = route(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const user = await requireUser(req);
  const { id } = await params;
  const { data: job } = await user.db.from("jobs").select("id, status, kind, engine, project_id, payload").eq("id", id).maybeSingle();
  if (!job) throw notFound("Job");
  if (job.status !== "failed" && job.status !== "cancelled") throw new ApiFailure("CONFLICT", "Only failed or cancelled jobs can be retried.");

  const admin = getAdmin();
  await admin.from("jobs").update({
    status: "queued", attempts: 0, error_code: null, error_message: null, cancel_requested: false, worker_id: null,
    lease_expires_at: null, finished_at: null, progress: 0, run_after: new Date().toISOString(),
  }).eq("id", id);
  if (job.kind === "render") {
    const exportId = (job.payload as { exportId?: string } | null)?.exportId;
    if (exportId) await admin.from("exports").update({ status_v2: "queued", status: "queued" }).eq("id", exportId);
  } else {
    await setProjectStatus(job.project_id, "processing");
  }
  if (job.engine === "cloud") {
    await markCloudRunning(id);
    after(() => runCloudTranscribe(id));
  }
  await logJobEvent(id, "retry", 0, "Retried by user");
  return ok({ status: "queued" });
});
