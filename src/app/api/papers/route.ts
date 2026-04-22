import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/db/client";
import { getUserPapers, addPaperToList } from "@/lib/db/queries";
import { enforceRateLimit } from "@/lib/rate-limit";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  const { user, supabase } = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const list = request.nextUrl.searchParams.get("list") as
    | "read"
    | "to_read"
    | null;

  if (!list || !["read", "to_read"].includes(list)) {
    return NextResponse.json(
      { error: "Query parameter list must be 'read' or 'to_read'" },
      { status: 400 }
    );
  }

  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE
  );
  const offset = Math.max(
    parseInt(request.nextUrl.searchParams.get("offset") || "0", 10) || 0,
    0
  );

  try {
    const papers = await getUserPapers(supabase, user.id, list, limit, offset);
    return NextResponse.json({ papers, limit, offset });
  } catch (error) {
    console.error("Get papers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch papers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { user, supabase } = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit
  const rl = await enforceRateLimit(supabase, user.id, "add_paper");
  if (rl.limited) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { arxiv_id, list, read_at } = body;

    if (!arxiv_id || !list || !["read", "to_read"].includes(list)) {
      return NextResponse.json(
        { error: "arxiv_id and list (read|to_read) are required" },
        { status: 400 }
      );
    }

    const id = await addPaperToList(supabase, user.id, arxiv_id, list, read_at);
    return NextResponse.json({ user_paper_id: id }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json(
        { error: "Paper already in your list" },
        { status: 409 }
      );
    }
    if (msg.includes("Paper limit reached")) {
      return NextResponse.json(
        { error: msg },
        { status: 403 }
      );
    }
    console.error("Add paper error:", error);
    return NextResponse.json(
      { error: "Failed to add paper" },
      { status: 500 }
    );
  }
}
