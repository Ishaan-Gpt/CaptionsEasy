import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { data: pairing } = await supabaseAdmin
    .from("worker_pairings")
    .select("*")
    .eq("code", code)
    .single();

  if (!pairing) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Pairing code not found" } }, { status: 404 });
  }

  let status = pairing.status;
  if (status === "pending" && new Date(pairing.expires_at) < new Date()) {
    status = "expired";
    await supabaseAdmin
      .from("worker_pairings")
      .update({ status: "expired" })
      .eq("code", code);
  }

  return NextResponse.json({
    success: true,
    data: {
      status: status,
      workerId: pairing.worker_id || null,
      expiresAt: pairing.expires_at,
    }
  });
}
