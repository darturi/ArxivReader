import { SupabaseClient } from "@supabase/supabase-js";
import { PaperResult } from "@/lib/types";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getCachedSearchResults(
  supabase: SupabaseClient,
  query: string
): Promise<PaperResult[] | null> {
  // We cache individual papers, not query results.
  // For query caching, we use a simple approach: check if we have
  // papers matching the query that were cached within the TTL.
  // Full query-result caching could be added with a separate table.
  return null; // For now, always go to ArXiv for searches
}

export async function cachePapers(
  supabase: SupabaseClient,
  papers: PaperResult[]
): Promise<void> {
  if (papers.length === 0) return;

  const rows = papers.map((p) => ({
    arxiv_id: p.arxiv_id,
    title: p.title,
    authors: JSON.stringify(p.authors),
    abstract: p.abstract,
    arxiv_url: p.arxiv_url,
    published_at: p.published_at || null,
    cached_at: new Date().toISOString(),
    source: p.source,
  }));

  await supabase.from("paper_cache").upsert(rows, { onConflict: "arxiv_id" });
}

export async function getCachedPaper(
  supabase: SupabaseClient,
  arxivId: string
): Promise<PaperResult | null> {
  const { data } = await supabase
    .from("paper_cache")
    .select("*")
    .eq("arxiv_id", arxivId)
    .single();

  if (!data) return null;

  const cachedAt = new Date(data.cached_at).getTime();
  if (Date.now() - cachedAt > CACHE_TTL_MS) return null;

  return {
    arxiv_id: data.arxiv_id,
    title: data.title,
    authors: typeof data.authors === "string" ? JSON.parse(data.authors) : data.authors,
    abstract: data.abstract,
    arxiv_url: data.arxiv_url,
    published_at: data.published_at,
    source: data.source,
  };
}
