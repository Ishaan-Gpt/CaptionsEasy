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

  if (pairing.status !== "pending") {
    return NextResponse.json({ success: false, error: { code: "ALREADY_CLAIMED", message: `Pairing already ${pairing.status}.` } }, { status: 409 });
  }

  if (new Date(pairing.expires_at) < new Date()) {
    await supabaseAdmin.from("worker_pairings").update({ status: "expired" }).eq("code", code);
    return NextResponse.json({ success: false, error: { code: "PAIRING_EXPIRED", message: "Pairing code expired." } }, { status: 409 });
  }

  // Create worker
  const { data: worker, error: workerError } = await supabaseAdmin
    .from("workers")
    .insert({
      owner_id: user.id,
      name: pairing.worker_name,
      worker_url: pairing.worker_url,
      worker_token: pairing.worker_token,
      status: "online",
      last_seen_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (workerError || !worker) {
    return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: "Failed to create worker." } }, { status: 500 });
  }

  // Update pairing
  await supabaseAdmin
    .from("worker_pairings")
    .update({ status: "confirmed", worker_id: worker.id, owner_id: user.id, claimed_at: new Date().toISOString() })
    .eq("code", code);

  return NextResponse.json({ success: true, data: { workerId: worker.id, name: worker.name } });
}
