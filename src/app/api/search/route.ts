import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/db/client";
import { getDefaultAdapter } from "@/lib/adapters";
import { cachePapers } from "@/lib/cache";
import { checkRateLimit, recordAction } from "@/lib/rate-limit";

const ARXIV_ID_PATTERN = /^\d{4}\.\d{4,5}$/;
const DOI_PATTERN = /^10\.\d{4,}/;

export async function GET(request: NextRequest) {
  const { user, supabase } = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json(
      { error: "Query parameter q is required" },
      { status: 400 }
    );
  }

  // Check rate limit
  const { allowed, remaining } = await checkRateLimit(supabase, user.id);
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later.", remaining: 0 },
      { status: 429 }
    );
  }

  try {
    const adapter = getDefaultAdapter();
    let papers;

    if (ARXIV_ID_PATTERN.test(query) || DOI_PATTERN.test(query)) {
      const paper = await adapter.fetchByIdentifier(query);
      papers = paper ? [paper] : [];
    } else {
      papers = await adapter.search(query);
    }

    // Cache results and record the search
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
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search unavailable, please try again shortly." },
      { status: 503 }
    );
  }
}
