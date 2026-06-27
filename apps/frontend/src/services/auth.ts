import { User } from "./types";

const MOCK_USER_KEY = "motionai_mock_user";
const MOCK_TOKEN_KEY = "motionai_mock_token";

export const authService = {
  async register(name: string, email: string, password: string): Promise<{ user: User; token: string }> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    // Simulate error cases for testing
    if (email.includes("error")) {
      throw new Error("Email already registered");
    }

    const user: User = {
      id: "u_" + Math.random().toString(36).substr(2, 9),
      email,
      name,
      avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
      created_at: new Date().toISOString(),
    };

    localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
    localStorage.setItem(MOCK_TOKEN_KEY, "mock_jwt_token_" + Math.random().toString());

    return { user, token: "mock_jwt_token_123" };
  },

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (email.includes("error")) {
      throw new Error("Invalid email or password");
    }

    const name = email.split("@")[0];
    const user: User = {
      id: "u_existing",
      email,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
      created_at: new Date().toISOString(),
    };

    localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
    localStorage.setItem(MOCK_TOKEN_KEY, "mock_jwt_token_456");

    return { user, token: "mock_jwt_token_456" };
  },

  async logout(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    localStorage.removeItem(MOCK_USER_KEY);
    localStorage.removeItem(MOCK_TOKEN_KEY);
  },

  async getCurrentUser(): Promise<User | null> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const userStr = localStorage.getItem(MOCK_USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem(MOCK_TOKEN_KEY);
  }
};
