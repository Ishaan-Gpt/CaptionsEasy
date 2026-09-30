import { CompleteVideoBody } from "@capseasy/shared";
import { requireUser } from "@/lib/api/auth";
import { startTranscription } from "@/lib/api/engine";
import { ApiFailure, notFound, ok, parseBody, route, type Ctx } from "@/lib/api/http";
import { enqueueJob } from "@/lib/api/jobs";
import { objectSize } from "@/lib/api/storage";
import { getAdmin } from "@/lib/supabase/admin";

export const maxDuration = 300; // cloud transcription runs in after()

/** Step 2 of upload: confirm the object really exists, then start transcription (companion or cloud). */
export const POST = route(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const user = await requireUser(req);
  const { id: videoId } = await params;
  const body = await parseBody(req, CompleteVideoBody);

  const { data: video } = await user.db.from("videos").select("id, project_id, storage_path, status, file_size").eq("id", videoId).maybeSingle();
  if (!video) throw notFound("Video");

  const size = await objectSize(video.storage_path);
  if (size === null || size === 0) throw new ApiFailure("CONFLICT", "The upload did not finish. Please try again.");
  await getAdmin().from("videos").update({ status: "uploaded", file_size: size, uploaded_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", videoId);

  // idempotent per video: a retried "complete" returns the same job
  const r = await startTranscription({ ownerId: user.id, projectId: video.project_id, videoId, idempotencyKey: `transcribe:${videoId}` });
  if (body.needsProxy) {
    await enqueueJob({ ownerId: user.id, projectId: video.project_id, kind: "proxy", payload: { kind: "proxy", videoId, targetHeight: 720 }, idempotencyKey: `proxy:${videoId}`, priority: 1 });
  }
  return ok(r);
});
