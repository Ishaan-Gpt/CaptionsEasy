import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdmin, getUserClient } from "../supabase/admin";
import { ApiFailure } from "./http";

export interface AuthedUser {
  id: string;
  email: string | null;
  token: string;
  /** acts as the user; Postgres RLS enforces ownership */
  db: SupabaseClient;
}

const bearer = (req: Request): string | null => {
  const h = req.headers.get("authorization");
  return h?.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() || null : null;
};

/** Verifies the Supabase access token and returns an RLS-scoped client. profiles.id === auth.users.id since P1. */
export async function requireUser(req: Request): Promise<AuthedUser> {
  const token = bearer(req);
  if (!token) throw new ApiFailure("UNAUTHORIZED", "Missing bearer token");
  const { data, error } = await getAdmin().auth.getUser(token);
  if (error || !data.user) throw new ApiFailure("UNAUTHORIZED", "Invalid or expired token");
  return { id: data.user.id, email: data.user.email ?? null, token, db: getUserClient(token) };
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export interface AuthedWorker {
  id: string;
  ownerId: string;
  name: string;
}

/** Companion auth: `Authorization: Bearer cpe_...` looked up by SHA-256 hash; revoked workers are rejected. */
export async function requireWorker(req: Request): Promise<AuthedWorker> {
  const token = bearer(req);
  if (!token || !token.startsWith("cpe_")) throw new ApiFailure("UNAUTHORIZED", "Missing companion token");
  const admin = getAdmin();
  const { data } = await admin
    .from("workers")
    .select("id, owner_id, name, revoked_at, last_seen_at")
    .eq("token_hash", sha256(token))
    .maybeSingle();
  if (!data || data.revoked_at) throw new ApiFailure("UNAUTHORIZED", "Companion token is invalid or was revoked");
  // throttle liveness writes to once every 10 s
  if (!data.last_seen_at || Date.now() - new Date(data.last_seen_at).getTime() > 10_000) {
    await admin.from("workers").update({ last_seen_at: new Date().toISOString(), status: "online" }).eq("id", data.id);
  }
  return { id: data.id, ownerId: data.owner_id, name: data.name };
}
