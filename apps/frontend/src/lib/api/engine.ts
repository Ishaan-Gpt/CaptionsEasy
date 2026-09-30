import "server-only";
import { ProjectSettingsSchema, type TranscribeJob } from "@capseasy/shared";
import { after } from "next/server";
import { getAdmin } from "../supabase/admin";
import { cloudEligibility, markCloudRunning, runCloudTranscribe } from "./cloudAsr";
import { ApiFailure } from "./http";
import { enqueueJob, hasOnlineCompanion, setProjectStatus } from "./jobs";

export type EngineChoice = "auto" | "local" | "cloud";

/**
 * Queue (local) or start (cloud) transcription of a video.
 * auto: the user's computer when it's online, otherwise the cloud when allowed, otherwise wait for the computer.
 */
export async function startTranscription(opts: { ownerId: string; projectId: string; videoId: string; requested?: EngineChoice; idempotencyKey: string }) {
  const admin = getAdmin();
  const [{ data: project }, { data: profile }, { data: video }] = await Promise.all([
    admin.from("projects").select("language, settings_json").eq("id", opts.projectId).single(),
    admin.from("profiles").select("preferences").eq("id", opts.ownerId).maybeSingle(),
    admin.from("videos").select("storage_path, mime_type, file_size").eq("id", opts.videoId).single(),
  ]);
  const settings = ProjectSettingsSchema.parse(project?.settings_json ?? {});
  const prefs = (profile?.preferences ?? {}) as { whisper_model?: string; transcription_engine?: EngineChoice };
  const wanted = opts.requested ?? prefs.transcription_engine ?? "auto";
  const online = await hasOnlineCompanion(opts.ownerId);
  const cloud = video ? await cloudEligibility(opts.ownerId, video) : { ok: false, reason: "Video not found" };

  let engine: "local" | "cloud" = "local";
  if (wanted === "cloud") {
    if (!cloud.ok) throw new ApiFailure("CONFLICT", cloud.reason ?? "Cloud transcription isn't available for this video.");
    engine = "cloud";
  } else if (wanted === "auto" && !online && cloud.ok) {
    engine = "cloud";
  }

  const payload: TranscribeJob = {
    kind: "transcribe",
    videoId: opts.videoId,
    engine,
    model: prefs.whisper_model ?? "small",
    language: project?.language && project.language !== "auto" ? project.language : settings.language,
    romanize: settings.romanize,
    prompt: settings.customVocabulary.length ? settings.customVocabulary.join(", ") : undefined,
  };
  const job = await enqueueJob({ ownerId: opts.ownerId, projectId: opts.projectId, kind: "transcribe", payload, engine, idempotencyKey: `${opts.idempotencyKey}:${engine}` });
  await setProjectStatus(opts.projectId, "processing");
  if (engine === "cloud" && job.status === "queued") {
    await markCloudRunning(job.id);
    after(() => runCloudTranscribe(job.id));
  }
  return { jobId: job.id as string, engine, companionOnline: online, cloudAvailable: cloud.ok };
}
