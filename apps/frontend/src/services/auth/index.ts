import { supabaseAuthProvider } from "./supabaseAuthProvider";

/**
 * Single switch point: swap `mockAuthProvider` for a real Supabase-backed
 * `AuthProvider` here when Sprint 1.x wires Supabase Auth — no other file
 * in the app needs to change (api-client.ts and every page import
 * `authService` from this module, not the concrete provider).
 */
export const authService = supabaseAuthProvider;

export type { AuthProvider } from "./types";
