import { requireUser } from "@/lib/api/auth";
import { hasOnlineCompanion } from "@/lib/api/jobs";
import { notFound, ok, route, type Ctx } from "@/lib/api/http";
import { HOUR, signedGet } from "@/lib/api/storage";

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

  const [{ data: video }, { data: doc }, { data: jobs }] = await Promise.all([
    user.db.from("videos").select("id, storage_path, preview_path, status, width, height, fps, duration_ms, has_audio, original_filename, file_size").eq("project_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    user.db.from("caption_documents").select("revision, doc").eq("project_id", id).maybeSingle(),
    user.db.from("jobs").select("id, kind, status, progress, stage, message, error_code, error_message, attempts, created_at").eq("project_id", id).order("created_at", { ascending: false }).limit(6),
  ]);

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
  const latestFailed = !active ? (jobs ?? []).find((j) => j.status === "failed" && !doc) : undefined;

  return ok({
    project,
    video: videoOut,
    document: doc ?? { revision: 0, doc: null },
    job: active ?? latestFailed ?? null,
    companionOnline: await hasOnlineCompanion(user.id),
  });
});
