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

/** Soft delete; running jobs are cancelled so no computer keeps working on a deleted project. */
export const DELETE = route(async (req: Request, { params }: Ctx<{ id: string }>) => {
  const user = await requireUser(req);
  const { id } = await params;
  const now = new Date().toISOString();
  const { data } = await user.db.from("projects").update({ deleted_at: now, updated_at: now }).eq("id", id).is("deleted_at", null).select("id").maybeSingle();
  if (!data) throw notFound("Project");
  const admin = getAdmin();
  await admin.from("jobs").update({ status: "cancelled", finished_at: now }).eq("project_id", id).eq("status", "queued");
  await admin.from("jobs").update({ cancel_requested: true }).eq("project_id", id).eq("status", "processing");
  return ok({ deleted: true });
});
