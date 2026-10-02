"use client";

import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

/**
 * Guest mode: a new visitor gets an anonymous Supabase account (a real user id, so uploads, RLS and the
 * studio all work unchanged) and only creates a real account when they export. Linking keeps the same
 * user id, so nothing they made is lost.
 */

/** A guest is an anonymous user who hasn't given an email yet (a pending email counts as signed up). */
export const isGuestUser = (u: User | null | undefined) => !!u?.is_anonymous && !u.email && !u.new_email;

export async function currentUserIsGuest() {
  const { data } = await supabase.auth.getSession();
  return isGuestUser(data.session?.user);
}

/** Starts a guest session. Returns false when anonymous sign-ins are off in Supabase (caller sends to sign-up). */
export async function startGuestSession(): Promise<boolean> {
  const { data, error } = await supabase.auth.signInAnonymously();
  return !error && !!data.session;
}

/** Keeps everything the guest made: Google is linked to the same user id, then returns to `returnTo`. */
export async function upgradeWithGoogle(returnTo: string) {
  const { error } = await supabase.auth.linkIdentity({ provider: "google", options: { redirectTo: returnTo } });
  if (error) throw new Error(error.message);
}

/** Email + password on the same user id. Supabase emails a confirmation link; the work stays where it is. */
export async function upgradeWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.updateUser({ email });
  if (error) throw new Error(error.message);
  // some projects only accept the password once the email is confirmed; the reset flow covers that case
  await supabase.auth.updateUser({ password }).catch(() => undefined);
}
