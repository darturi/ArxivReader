import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/db/client";
import { deleteTag } from "@/lib/db/queries";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase } = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit
  const rl = await enforceRateLimit(supabase, user.id, "delete_tag");
  if (rl.limited) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const { id } = await params;
    await deleteTag(supabase, user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete tag error:", error);
    return NextResponse.json(
      { error: "Failed to delete tag" },
      { status: 500 }
    );
  }
}
