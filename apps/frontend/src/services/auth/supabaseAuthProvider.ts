import { User } from "../types";
import { AuthProvider } from "./types";
import { supabase } from "./supabaseClient";

const PROJECT_REF = "sqalfzybuydgsaqocysb";
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

function mapSupabaseUser(sbUser: any): User {
  const name = sbUser.user_metadata?.name || sbUser.email?.split("@")[0] || "User";
  return {
    id: sbUser.id,
    email: sbUser.email || "",
    name: name.charAt(0).toUpperCase() + name.slice(1),
    avatar_url: sbUser.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
    created_at: sbUser.created_at,
  };
}

let activeToken: string | null = null;

// Track auth state changes to dynamically cache the token
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((_event, session) => {
    activeToken = session?.access_token || null;
  });
}

function getPersistedToken(): string | null {
  if (typeof window === "undefined") return null;
  const sessionStr = localStorage.getItem(STORAGE_KEY);
  if (!sessionStr) return null;
  try {
    const session = JSON.parse(sessionStr);
    return session?.access_token || null;
  } catch {
    return null;
  }
}

export const supabaseAuthProvider: AuthProvider = {
  async register(name: string, email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error("Registration failed. No user returned.");
    }

    const user = mapSupabaseUser(data.user);
    const token = data.session?.access_token || getPersistedToken() || "";
    activeToken = token;

    return { user, token };
  },

  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user || !data.session) {
      throw new Error("Login failed. No session returned.");
    }

    const user = mapSupabaseUser(data.user);
    const token = data.session.access_token;
    activeToken = token;

    return { user, token };
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
    activeToken = null;
  },

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return mapSupabaseUser(user);
  },

  getToken() {
    if (activeToken) return activeToken;
    const token = getPersistedToken();
    if (token) activeToken = token;
    return token;
  },

  isAuthenticated() {
    return !!this.getToken();
  },
};
