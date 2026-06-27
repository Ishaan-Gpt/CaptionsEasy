import { User } from "../types";

/**
 * Source: Sprint 1.6 brief > Authentication ("Make replacing it with
 * Supabase Auth a single-module change."). Every provider (mock today,
 * Supabase later) implements this interface; callers (pages, api-client)
 * only ever depend on this shape, never on a concrete provider.
 */
export interface AuthProvider {
  login(email: string, password: string): Promise<{ user: User; token: string }>;
  register(name: string, email: string, password: string): Promise<{ user: User; token: string }>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  getToken(): string | null;
  isAuthenticated(): boolean;
}
