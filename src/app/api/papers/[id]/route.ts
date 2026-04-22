import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/db/client";
import {
  getUserPaper,
  updateUserPaper,
  deleteUserPaper,
} from "@/lib/db/queries";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase } = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const paper = await getUserPaper(supabase, user.id, id);

  if (!paper) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }

  return NextResponse.json(paper);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase } = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit
  const rl = await enforceRateLimit(supabase, user.id, "update_paper");
  if (rl.limited) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const updates: { list?: "read" | "to_read"; notes?: string; read_at?: string | null } = {};

    if (body.list && ["read", "to_read"].includes(body.list)) {
      updates.list = body.list;
    }
    if (body.notes !== undefined) {
      updates.notes = body.notes;
    }
    if (body.read_at !== undefined) {
      updates.read_at = body.read_at;
    }

    await updateUserPaper(supabase, user.id, id, updates);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Update paper error:", error);
    return NextResponse.json(
      { error: "Failed to update paper" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase } = await getAuthUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit
  const rl = await enforceRateLimit(supabase, user.id, "delete_paper");
  if (rl.limited) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const { id } = await params;
    await deleteUserPaper(supabase, user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete paper error:", error);
    return NextResponse.json(
      { error: "Failed to delete paper" },
      { status: 500 }
    );
  }
}
