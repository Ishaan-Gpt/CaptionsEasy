import { HeartbeatBody } from "@capseasy/shared";
import { requireWorker } from "@/lib/api/auth";
import { ok, parseBody, route } from "@/lib/api/http";
import { getAdmin } from "@/lib/supabase/admin";

export const POST = route(async (req: Request) => {
  const worker = await requireWorker(req);
  const body = await parseBody(req, HeartbeatBody);
  const admin = getAdmin();
  await admin.from("workers").update({
    status: "online",
    last_seen_at: new Date().toISOString(),
    last_error: null,
    ...(body.version ? { version: body.version } : {}),
    ...(body.platform ? { platform: body.platform } : {}),
    ...(body.capabilities ? { capabilities: body.capabilities } : {}),
    current_job_id: body.currentJobId ?? null,
  }).eq("id", worker.id);

  // jobs the user cancelled while this companion is working on them
  const { data: cancelled } = await admin.from("jobs").select("id").eq("worker_id", worker.id).eq("status", "processing").eq("cancel_requested", true);
  return ok({
    workerId: worker.id,
    minVersion: process.env.COMPANION_MIN_VERSION ?? "0.0.0",
    pollHintMs: 3000,
    cancelJobIds: (cancelled ?? []).map((j) => j.id),
  });
});
