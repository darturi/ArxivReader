import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/db/client";
import { addTagToPaper } from "@/lib/db/queries";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const { id } = await params;
    const body = await request.json();

    if (!body.tag_id) {
      return NextResponse.json(
        { error: "tag_id is required" },
        { status: 400 }
      );
    }

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

    await addTagToPaper(supabase, id, body.tag_id);

    // Return all current tags for this paper so the client has the truth
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
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Add tag error:", msg, error);
    return NextResponse.json(
      { error: `Failed to add tag: ${msg}` },
      { status: 500 }
    );
  }
}
