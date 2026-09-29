import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

const _WORDS = ["PANDA", "TIGER", "OTTER", "EAGLE", "WHALE", "LEMUR", "ORCA", "LYNX", "SWAN", "FALCON"];
const _ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  const word = _WORDS[Math.floor(Math.random() * _WORDS.length)];
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += _ALPHA[Math.floor(Math.random() * _ALPHA.length)];
  }
  return `${word}-${suffix}`;
}

export async function POST(req: NextRequest) {
  const { worker_name, worker_token, worker_url } = await req.json();

  let code = generateCode();
  // Simplified: just try once, collisions are very rare
  const expiresAt = new Date(Date.now() + 15 * 60000).toISOString();

  const { error } = await supabaseAdmin
    .from("worker_pairings")
    .insert({
      code: code,
      worker_name: worker_name || "My Computer",
      worker_token: worker_token,
      worker_url: worker_url,
      status: "pending",
      expires_at: expiresAt
    });

  if (error) {
    return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: "Failed to create pairing" } }, { status: 500 });
  }

  const protocol = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host");
  const baseUrl = `${protocol}://${host}`;

  return NextResponse.json({
    success: true,
    data: {
      code: code,
      confirmUrl: `${baseUrl}/pair?code=${code}`,
      pollUrl: `${baseUrl}/api/v1/pair/${code}`,
      expiresInSec: 15 * 60
    }
  }, { status: 201 });
}
