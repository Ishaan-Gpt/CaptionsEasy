import { z } from "zod";
import { CaptionStyleSchema, PlatformSchema, ProjectSettingsSchema } from "@capseasy/shared";
import { requireUser } from "@/lib/api/auth";
import { ApiFailure, notFound, ok, parseBody, route, type Ctx } from "@/lib/api/http";
import { PROJECT_COLUMNS, toApiProject } from "@/lib/api/projects";
import { getAdmin } from "@/lib/supabase/admin";

export const GET = route(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const user = await requireUser(req);
  const { id } = await params;
  const { data } = await user.db.from("projects").select(PROJECT_COLUMNS).eq("id", id).is("deleted_at", null).maybeSingle();
  if (!data) throw notFound("Project");
  return ok(toApiProject(data));
});

/** Allow-list: unknown keys are stripped, so owner_id/status/deleted_at can never be set by a client. */
const PatchBody = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().max(2000).nullable(),
    language: z.string().max(20).nullable(),
    aspect_ratio: z.enum(["9:16", "16:9", "1:1", "4:5"]).nullable(),
    platform: PlatformSchema.nullable(),
    look_id: z.string().max(80).nullable(),
    template_id: z.string().max(80).nullable(),
    style_json: CaptionStyleSchema.partial().passthrough(),
    settings_json: ProjectSettingsSchema.partial(),
  })
  .partial();

export const PATCH = route(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const user = await requireUser(req);
  const { id } = await params;
  const patch = await parseBody(req, PatchBody);
  if (Object.keys(patch).length === 0) throw new ApiFailure("VALIDATION", "No editable fields provided");
  if (patch.style_json && JSON.stringify(patch.style_json).length > 64_000) throw new ApiFailure("LIMIT_EXCEEDED", "Style is too large");
  const { data, error } = await user.db
    .from("projects")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(PROJECT_COLUMNS)
    .maybeSingle();
  if (error) throw new ApiFailure("INTERNAL", "Could not save", error.message);
  if (!data) throw notFound("Project");
  return ok(toApiProject(data));
});

/**
 * Permanent delete: running jobs are cancelled (a desktop helper drops its work), every stored file of the project
 * is removed, then its rows. Returns the video ids so the browser can also drop its on-device copies.
 */
export const DELETE = route(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const user = await requireUser(req);
  const { id } = await params;
  const { data: project } = await user.db.from("projects").select("id").eq("id", id).maybeSingle();
  if (!project) throw notFound("Project");
  const admin = getAdmin();
  const now = new Date().toISOString();
  await admin.from("jobs").update({ status: "cancelled", finished_at: now }).eq("project_id", id).eq("status", "queued");
  await admin.from("jobs").update({ cancel_requested: true }).eq("project_id", id).eq("status", "processing");

  const [{ data: videos }, { data: exportsRows }, { data: objects }] = await Promise.all([
    admin.from("videos").select("id, storage_path, preview_path").eq("project_id", id),
    admin.from("exports").select("storage_path").eq("project_id", id),
    admin.rpc("user_storage_paths", { p_user: user.id }),
  ]);
  const byBucket = new Map<string, Set<string>>();
  const add = (bucket: string, name: string | null | undefined) => {
    if (!name || name.startsWith("local:")) return;
    byBucket.set(bucket, (byBucket.get(bucket) ?? new Set()).add(name));
  };
  // everything under <user>/<project>/ in any bucket, plus paths recorded on rows (older uploads)
  for (const o of (objects ?? []) as { bucket: string; name: string }[]) if (o.name.split("/")[1] === id) add(o.bucket, o.name);
  for (const v of videos ?? []) {
    add(v.storage_path?.startsWith(`${user.id}/`) ? "media" : "videos", v.storage_path);
    add("media", v.preview_path);
  }
  for (const e of (exportsRows ?? []) as { storage_path?: string | null }[]) add("media", e.storage_path);
  for (const [bucket, names] of byBucket) {
    const list = [...names];
    for (let i = 0; i < list.length; i += 100) await admin.storage.from(bucket).remove(list.slice(i, i + 100));
  }

  for (const t of ["exports", "caption_documents", "jobs", "transcripts", "usage_events", "videos"]) {
    const { error } = await admin.from(t).delete().eq("project_id", id);
    if (error) throw new ApiFailure("INTERNAL", "Could not delete the project", `${t}: ${error.message}`);
  }
  const { error } = await admin.from("projects").delete().eq("id", id);
  if (error) throw new ApiFailure("INTERNAL", "Could not delete the project", error.message);
  return ok({ deleted: true, videoIds: (videos ?? []).map((v) => v.id) });
});
