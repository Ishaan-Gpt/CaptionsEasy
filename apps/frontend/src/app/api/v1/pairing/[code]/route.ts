import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest } from "@/utils/supabaseAdmin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }, { status: 401 });
  }

  const { code } = await params;
  const { data: pairing } = await supabaseAdmin
    .from("worker_pairings")
    .select("*")
    .eq("code", code)
    .single();

  if (!pairing) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Pairing code not found." } }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      code: pairing.code,
      workerName: pairing.worker_name,
      status: pairing.status,
      expiresAt: pairing.expires_at,
    }
  });
}
