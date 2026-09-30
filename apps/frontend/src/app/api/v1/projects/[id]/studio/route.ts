import { legacyTranscriptToDoc } from "@motion-ai/caption-engine/core";
import { requireUser } from "@/lib/api/auth";
import { hasOnlineCompanion, pairedComputerNames } from "@/lib/api/jobs";
import { notFound, ok, route, type Ctx } from "@/lib/api/http";
import { HOUR, signedGet } from "@/lib/api/storage";
import { getAdmin } from "@/lib/supabase/admin";
import { cloudEligibility } from "@/lib/api/cloudAsr";

/**
 * Everything the editor needs in one RLS-scoped call: project, playable video URL, caption document,
 * the latest job (for progress UI) and whether a companion is online. Polled while processing.
 */
export const GET = route(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const user = await requireUser(req);
  const { id } = await params;

  const { data: project } = await user.db
    .from("projects")
    .select("id, title, status, language, aspect_ratio, look_id, template_id, style_json, settings_json, platform, updated_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!project) throw notFound("Project");

  const [{ data: video }, { data: docRow }, { data: jobs }] = await Promise.all([
    user.db.from("videos").select("id, storage_path, preview_path, status, width, height, fps, duration_ms, has_audio, original_filename, file_size, mime_type").eq("project_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    user.db.from("caption_documents").select("revision, doc").eq("project_id", id).maybeSingle(),
    // only v2 jobs (legacy pipeline jobs have no `kind` and will never run again)
    user.db.from("jobs").select("id, kind, status, progress, stage, message, error_code, error_message, attempts, created_at").eq("project_id", id).not("kind", "is", null).order("created_at", { ascending: false }).limit(6),
  ]);

  // Legacy projects: an old-pipeline transcript exists but no editable document yet -> convert once.
  let doc = docRow;
  if (!doc) {
    const { data: t } = await user.db.from("transcripts").select("id, transcript_json, words_json").eq("project_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (t) {
      const migrated = t.words_json
        ? legacyTranscriptToDoc({ words: (t.words_json as { text: string; startMs: number; endMs: number }[]).map((w) => ({ text: w.text, start_ms: w.startMs, end_ms: w.endMs })) })
        : legacyTranscriptToDoc(t.transcript_json);
      if (migrated.words.length > 0) {
        migrated.meta.createdFromTranscriptId = t.id;
        const { data: inserted } = await getAdmin()
          .from("caption_documents")
          .upsert({ project_id: id, owner_id: user.id, doc: migrated, source_transcript_id: t.id }, { onConflict: "project_id", ignoreDuplicates: true })
          .select("revision, doc")
          .maybeSingle();
        doc = inserted ?? (await user.db.from("caption_documents").select("revision, doc").eq("project_id", id).maybeSingle()).data;
      }
    }
  }

  let videoOut: Record<string, unknown> | null = null;
  if (video) {
    const playPath = video.preview_path ?? video.storage_path;
    videoOut = {
      id: video.id,
      status: video.status,
      url: await signedGet(playPath, 2 * HOUR).catch(() => null),
      width: video.width, height: video.height, fps: video.fps, durationMs: video.duration_ms,
      hasAudio: video.has_audio, filename: video.original_filename, size: video.file_size,
    };
  }

  const active = (jobs ?? []).find((j) => j.status === "queued" || j.status === "processing");
  const latestFailed = !active && !doc ? (jobs ?? []).find((j) => j.status === "failed" && j.kind === "transcribe") : undefined;

  return ok({
    project,
    video: videoOut,
    document: doc ?? { revision: 0, doc: null },
    job: active ?? latestFailed ?? null,
    // video uploaded but nothing is running and there are no captions: offer "Generate captions"
    canTranscribe: Boolean(video && video.status !== "uploading" && !doc && !active),
    companionOnline: await hasOnlineCompanion(user.id),
    pairedComputers: await pairedComputerNames(user.id),
    cloudAvailable: video ? (await cloudEligibility(user.id, video)).ok : false,
  });
});
