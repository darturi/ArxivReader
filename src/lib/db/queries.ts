import { SupabaseClient } from "@supabase/supabase-js";
import { UserPaperWithDetails, Tag } from "@/lib/types";

// ---- User Papers ----

export async function getUserPapers(
  supabase: SupabaseClient,
  userId: string,
  list: "read" | "to_read",
  limit: number = 50,
  offset: number = 0
): Promise<UserPaperWithDetails[]> {
  const { data: userPapers, error } = await supabase
    .from("user_papers")
    .select(
      `
      id,
      user_id,
      arxiv_id,
      list,
      added_at,
      notes,
      read_at,
      paper_cache (
        title,
        authors,
        abstract,
        arxiv_url,
        published_at
      )
    `
    )
    .eq("user_id", userId)
    .eq("list", list)
    .order("added_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  if (!userPapers) return [];

  // Now get tags for each user_paper
  const paperIds = userPapers.map((p: Record<string, unknown>) => p.id);

  const { data: paperTags } = await supabase
    .from("paper_tags")
    .select(
      `
      user_paper_id,
      tags (
        id,
        user_id,
        name,
        created_at
      )
    `
    )
    .in("user_paper_id", paperIds);

  const tagsByPaperId: Record<string, Tag[]> = {};
  if (paperTags) {
    for (const pt of paperTags) {
      const paperId = pt.user_paper_id as string;
      if (!tagsByPaperId[paperId]) tagsByPaperId[paperId] = [];
      if (pt.tags) {
        const tag = pt.tags as unknown as Tag;
        tagsByPaperId[paperId].push(tag);
      }
    }
  }

  return userPapers.map((p: Record<string, unknown>) => {
    const cache = p.paper_cache as Record<string, unknown> | null;
    return {
      id: p.id as string,
      user_id: p.user_id as string,
      arxiv_id: p.arxiv_id as string,
      list: p.list as "read" | "to_read",
      added_at: p.added_at as string,
      notes: p.notes as string | null,
      read_at: (p.read_at as string) || null,
      title: cache?.title as string || "",
      authors:
        typeof cache?.authors === "string"
          ? JSON.parse(cache.authors as string)
          : (cache?.authors as string[]) || [],
      abstract: (cache?.abstract as string) || "",
      arxiv_url: (cache?.arxiv_url as string) || "",
      published_at: (cache?.published_at as string) || "",
      tags: tagsByPaperId[p.id as string] || [],
    };
  });
}

export async function getUserPaper(
  supabase: SupabaseClient,
  userId: string,
  paperId: string
): Promise<UserPaperWithDetails | null> {
  const { data, error } = await supabase
    .from("user_papers")
    .select(
      `
      id,
      user_id,
      arxiv_id,
      list,
      added_at,
      notes,
      read_at,
      paper_cache (
        title,
        authors,
        abstract,
        arxiv_url,
        published_at
      )
    `
    )
    .eq("id", paperId)
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;

  const { data: paperTags } = await supabase
    .from("paper_tags")
    .select(
      `
      tags (
        id,
        user_id,
        name,
        created_at
      )
    `
    )
    .eq("user_paper_id", paperId);

  const tags: Tag[] = (paperTags || [])
    .map((pt: Record<string, unknown>) => pt.tags as unknown as Tag)
    .filter(Boolean);

  const cache = data.paper_cache as unknown as Record<string, unknown> | null;
  return {
    id: data.id,
    user_id: data.user_id,
    arxiv_id: data.arxiv_id,
    list: data.list,
    added_at: data.added_at,
    notes: data.notes,
    read_at: data.read_at || null,
    title: (cache?.title as string) || "",
    authors:
      typeof cache?.authors === "string"
        ? JSON.parse(cache.authors as string)
        : (cache?.authors as string[]) || [],
    abstract: (cache?.abstract as string) || "",
    arxiv_url: (cache?.arxiv_url as string) || "",
    published_at: (cache?.published_at as string) || "",
    tags,
  };
}

export async function addPaperToList(
  supabase: SupabaseClient,
  userId: string,
  arxivId: string,
  list: "read" | "to_read",
  readAt?: string | null
): Promise<string> {
  const row: Record<string, unknown> = { user_id: userId, arxiv_id: arxivId, list };
  if (list === "read" && readAt !== undefined) {
    row.read_at = readAt;
  }
  const { data, error } = await supabase
    .from("user_papers")
    .insert(row)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateUserPaper(
  supabase: SupabaseClient,
  userId: string,
  paperId: string,
  updates: { list?: "read" | "to_read"; notes?: string; read_at?: string | null }
): Promise<void> {
  const { error } = await supabase
    .from("user_papers")
    .update(updates)
    .eq("id", paperId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function deleteUserPaper(
  supabase: SupabaseClient,
  userId: string,
  paperId: string
): Promise<void> {
  const { error } = await supabase
    .from("user_papers")
    .delete()
    .eq("id", paperId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function getUserPaperByArxivId(
  supabase: SupabaseClient,
  userId: string,
  arxivId: string
): Promise<{ id: string; list: string } | null> {
  const { data } = await supabase
    .from("user_papers")
    .select("id, list")
    .eq("user_id", userId)
    .eq("arxiv_id", arxivId)
    .single();

  return data;
}

// ---- Tags ----

export async function getUserTags(
  supabase: SupabaseClient,
  userId: string
): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("user_id", userId)
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function createTag(
  supabase: SupabaseClient,
  userId: string,
  name: string
): Promise<Tag> {
  const { data, error } = await supabase
    .from("tags")
    .insert({ user_id: userId, name })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTag(
  supabase: SupabaseClient,
  userId: string,
  tagId: string
): Promise<void> {
  const { error } = await supabase
    .from("tags")
    .delete()
    .eq("id", tagId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function addTagToPaper(
  supabase: SupabaseClient,
  userPaperId: string,
  tagId: string
): Promise<void> {
  const { error } = await supabase
    .from("paper_tags")
    .insert({ user_paper_id: userPaperId, tag_id: tagId });

  if (error) throw error;
}

export async function removeTagFromPaper(
  supabase: SupabaseClient,
  userPaperId: string,
  tagId: string
): Promise<void> {
  const { error } = await supabase
    .from("paper_tags")
    .delete()
    .eq("user_paper_id", userPaperId)
    .eq("tag_id", tagId);

  if (error) throw error;
}
