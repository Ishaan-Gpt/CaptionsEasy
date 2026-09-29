import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing env var: NEXT_PUBLIC_SUPABASE_URL");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing env var: SUPABASE_SERVICE_ROLE_KEY");
}

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function getUserFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  
  const token = authHeader.split(" ")[1];
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    return null;
  }

  // Resolve or create profile row to match database foreign key schema
  let profileId = user.id;
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profile?.id) {
      profileId = profile.id;
    } else {
      const { data: newProfile } = await supabaseAdmin
        .from("profiles")
        .insert({ auth_user_id: user.id })
        .select("id")
        .maybeSingle();
      if (newProfile?.id) {
        profileId = newProfile.id;
      }
    }
  } catch (err) {
    console.error("Failed to resolve profile:", err);
  }
  
  return {
    ...user,
    id: profileId,
    profile_id: profileId,
    auth_user_id: user.id,
  };
}

