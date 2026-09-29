import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest } from "@/utils/supabaseAdmin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
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

  await supabaseAdmin
    .from("worker_pairings")
    .update({ status: "denied", owner_id: user.id })
    .eq("code", code);

  return NextResponse.json({ success: true });
}
