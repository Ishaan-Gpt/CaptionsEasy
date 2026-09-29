import { CompleteVideoBody, ProjectSettingsSchema, type TranscribeJob } from "@capseasy/shared";
import { requireUser } from "@/lib/api/auth";
import { ApiFailure, notFound, ok, parseBody, route, type Ctx } from "@/lib/api/http";
import { enqueueJob, hasOnlineCompanion, setProjectStatus } from "@/lib/api/jobs";
import { objectSize } from "@/lib/api/storage";
import { getAdmin } from "@/lib/supabase/admin";

/** Step 2 of upload: confirm the object really exists, then queue transcription (and a proxy if needed). */
export const POST = route(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const user = await requireUser(req);
  const { id: videoId } = await params;
  const body = await parseBody(req, CompleteVideoBody);

  const { data: video } = await user.db.from("videos").select("id, project_id, storage_path, status, file_size").eq("id", videoId).maybeSingle();
  if (!video) throw notFound("Video");

  const size = await objectSize(video.storage_path);
  if (size === null || size === 0) throw new ApiFailure("CONFLICT", "The upload did not finish. Please try again.");

  const admin = getAdmin();
  await admin.from("videos").update({ status: "uploaded", file_size: size, uploaded_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", videoId);

  const [{ data: project }, { data: profile }] = await Promise.all([
    user.db.from("projects").select("language, settings_json").eq("id", video.project_id).maybeSingle(),
    user.db.from("profiles").select("preferences").eq("id", user.id).maybeSingle(),
  ]);
  const settings = ProjectSettingsSchema.parse(project?.settings_json ?? {});
  const prefs = (profile?.preferences ?? {}) as { whisper_model?: string };

  // Cloud ASR arrives in P6; until then the companion is the only engine.
  const payload: TranscribeJob = {
    kind: "transcribe",
    videoId,
    engine: "local",
    model: prefs.whisper_model ?? "small",
    language: project?.language && project.language !== "auto" ? project.language : settings.language,
    romanize: settings.romanize,
    prompt: settings.customVocabulary.length ? settings.customVocabulary.join(", ") : undefined,
  };

  const job = await enqueueJob({ ownerId: user.id, projectId: video.project_id, kind: "transcribe", payload, idempotencyKey: `transcribe:${videoId}` });
  if (body.needsProxy) {
    await enqueueJob({ ownerId: user.id, projectId: video.project_id, kind: "proxy", payload: { kind: "proxy", videoId, targetHeight: 720 }, idempotencyKey: `proxy:${videoId}`, priority: 1 });
  }
  await setProjectStatus(video.project_id, "processing");

  return ok({ jobId: job.id, engine: "local", companionOnline: await hasOnlineCompanion(user.id) });
});
