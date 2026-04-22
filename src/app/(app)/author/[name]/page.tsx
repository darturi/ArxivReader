"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { SearchResultPaper } from "@/lib/hooks";
import SearchResultCard from "@/components/SearchResultCard";

export default function AuthorPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const router = useRouter();
  const authorName = decodeURIComponent(name);
  const [papers, setPapers] = useState<SearchResultPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuthorPapers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/author?name=${encodeURIComponent(authorName)}`
      );
      if (res.status === 429) {
        setError("Rate limit reached. Please try again later.");
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to fetch author papers");
      }
      const data = await res.json();
      setPapers(data.papers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [authorName]);

  useEffect(() => {
    fetchAuthorPapers();
  }, [fetchAuthorPapers]);

  const handleAdd = async (
    paper: SearchResultPaper,
    list: "read" | "to_read",
    readAt?: string
  ) => {
    try {
      const body: Record<string, unknown> = { arxiv_id: paper.arxiv_id, list };
      if (readAt) body.read_at = readAt;

      const res = await fetch("/api/papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setPapers((prev) =>
          prev.map((p) =>
            p.arxiv_id === paper.arxiv_id ? { ...p, user_list: list } : p
          )
        );
      }
    } catch {
      // silent
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-xs text-stone-400 hover:text-stone-600"
        >
          &larr; Back
        </button>
        <h1 className="text-lg font-semibold text-stone-900 mt-2">
          {authorName}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {loading
            ? "Loading publications..."
            : `${papers.length} publication${papers.length !== 1 ? "s" : ""} found`}
        </p>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 rounded-lg bg-stone-100 animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && papers.length > 0 && (
        <div className="space-y-2">
          {papers.map((paper) => (
            <SearchResultCard
              key={paper.arxiv_id}
              paper={paper}
              onAdd={(list, readAt) => handleAdd(paper, list, readAt)}
            />
          ))}
        </div>
      )}

      {!loading && !error && papers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-stone-500">
            No publications found for this author.
          </p>
        </div>
      )}
    </div>
  );
}
