import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/db/client";
import { removeTagFromPaper } from "@/lib/db/queries";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  const { user, supabase } = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit
  const rl = await enforceRateLimit(supabase, user.id, "tag_paper");
  if (rl.limited) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const { id, tagId } = await params;

    // Verify user owns this paper
    const { data: paper } = await supabase
      .from("user_papers")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }

    await removeTagFromPaper(supabase, id, tagId);

    // Return remaining tags for this paper
    const { data: paperTags } = await supabase
      .from("paper_tags")
      .select(`
        tags (
          id,
          user_id,
          name,
          created_at
        )
      `)
      .eq("user_paper_id", id);

    const tags = (paperTags || [])
      .map((pt: Record<string, unknown>) => pt.tags)
      .filter(Boolean);

    return NextResponse.json({ ok: true, tags });
  } catch (error) {
    console.error("Remove tag error:", error);
    return NextResponse.json(
      { error: "Failed to remove tag" },
      { status: 500 }
    );
  }
}
