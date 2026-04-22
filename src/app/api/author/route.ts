import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/db/client";
import { getDefaultAdapter } from "@/lib/adapters";
import { cachePapers } from "@/lib/cache";
import { checkRateLimit, recordAction } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const { user, supabase } = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const name = request.nextUrl.searchParams.get("name")?.trim();
  if (!name) {
    return NextResponse.json(
      { error: "Query parameter name is required" },
      { status: 400 }
    );
  }

  // Check rate limit (shares the same budget as search)
  const { allowed, remaining } = await checkRateLimit(supabase, user.id);
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later.", remaining: 0 },
      { status: 429 }
    );
  }

  try {
    const adapter = getDefaultAdapter();
    const papers = await adapter.searchByAuthor(name);

    // Cache results and record the action
    await cachePapers(supabase, papers);
    await recordAction(supabase, user.id, "search");

    // Check which papers the user already has
    const arxivIds = papers.map((p) => p.arxiv_id);
    const { data: existing } = await supabase
      .from("user_papers")
      .select("arxiv_id, list")
      .eq("user_id", user.id)
      .in("arxiv_id", arxivIds);

    const existingMap: Record<string, string> = {};
    if (existing) {
      for (const e of existing) {
        existingMap[e.arxiv_id] = e.list;
      }
    }

    return NextResponse.json({
      papers: papers.map((p) => ({
        ...p,
        user_list: existingMap[p.arxiv_id] || null,
      })),
      remaining: remaining - 1,
    });
  } catch (error) {
    console.error("Author search error:", error);
    return NextResponse.json(
      { error: "Search unavailable, please try again shortly." },
      { status: 503 }
    );
  }
}
