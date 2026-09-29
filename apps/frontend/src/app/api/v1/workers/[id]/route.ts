import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest } from "@/utils/supabaseAdmin";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } }, { status: 401 });
  }

  const { id } = await params;
  const ownerIds = [user.id, user.auth_user_id].filter(Boolean);

  const { error } = await supabaseAdmin
    .from("workers")
    .delete()
    .eq("id", id)
    .in("owner_id", ownerIds);

  if (error) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Worker not found" } }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
