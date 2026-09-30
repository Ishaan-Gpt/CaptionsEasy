import { rateLimit } from "@/lib/api/rateLimit";
import { ProjectSettingsSchema, type TranscribeJob } from "@capseasy/shared";
import { requireUser } from "@/lib/api/auth";
import { ApiFailure, notFound, ok, route, type Ctx } from "@/lib/api/http";
import { enqueueJob, hasOnlineCompanion, setProjectStatus } from "@/lib/api/jobs";
import { getAdmin } from "@/lib/supabase/admin";

/** (Re)generate captions for the project's latest video. Reuses a transcribe job that is already queued/running. */
export const POST = route(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const user = await requireUser(req);
  await rateLimit(user.id, "transcribe", 60, 3600);
  const { id } = await params;

  const { data: project } = await user.db.from("projects").select("id, language, settings_json").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!project) throw notFound("Project");
  const { data: video } = await user.db.from("videos").select("id, status").eq("project_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!video || video.status === "uploading") throw new ApiFailure("CONFLICT", "Upload a video first.");

  const { data: running } = await user.db.from("jobs").select("id").eq("project_id", id).eq("kind", "transcribe").in("status", ["queued", "processing"]).limit(1).maybeSingle();
  if (running) return ok({ jobId: running.id, companionOnline: await hasOnlineCompanion(user.id) });

  const { data: profile } = await user.db.from("profiles").select("preferences").eq("id", user.id).maybeSingle();
  const settings = ProjectSettingsSchema.parse(project.settings_json ?? {});
  const prefs = (profile?.preferences ?? {}) as { whisper_model?: string };
  const payload: TranscribeJob = {
    kind: "transcribe",
    videoId: video.id,
    engine: "local",
    model: prefs.whisper_model ?? "small",
    language: project.language && project.language !== "auto" ? project.language : settings.language,
    romanize: settings.romanize,
    prompt: settings.customVocabulary.length ? settings.customVocabulary.join(", ") : undefined,
  };
  const job = await enqueueJob({ ownerId: user.id, projectId: id, kind: "transcribe", payload, idempotencyKey: `transcribe:${video.id}:${Date.now()}` });
  await getAdmin().from("videos").update({ status: "uploaded" }).eq("id", video.id);
  await setProjectStatus(id, "processing");
  return ok({ jobId: job.id, companionOnline: await hasOnlineCompanion(user.id) }, 202);
});
