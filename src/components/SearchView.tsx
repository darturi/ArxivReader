"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSearch, SearchResultPaper } from "@/lib/hooks";
import SearchResultCard from "./SearchResultCard";

export default function SearchView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const { results, loading, error, remaining, search, setResults } =
    useSearch();

  // Re-run the search when the page loads with a ?q= param (e.g. navigating back)
  useEffect(() => {
    if (initialQuery) {
      search(initialQuery);
    }
    // Only run on mount / when the URL param changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    // Push the query into the URL so it survives navigation
    router.replace(`/search?q=${encodeURIComponent(q)}`, { scroll: false });
    search(q);
  };

  const handleAdd = async (paper: SearchResultPaper, list: "read" | "to_read", readAt?: string) => {
    try {
      const body: Record<string, unknown> = { arxiv_id: paper.arxiv_id, list };
      if (readAt) body.read_at = readAt;

      const res = await fetch("/api/papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setResults((prev: SearchResultPaper[]) =>
          prev.map((p: SearchResultPaper) =>
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
      <h1 className="text-lg font-semibold text-stone-900 mb-6">
        Search Papers
      </h1>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, topic, or ArXiv ID (e.g. 2301.12345)..."
            className="flex-1 text-sm px-4 py-2.5 border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-2.5 text-sm font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
        {remaining !== null && (
          <p className="text-xs text-stone-400 mt-2">
            {remaining} searches remaining this hour
          </p>
        )}
      </form>

      {error && (
        <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-lg bg-stone-100 animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((paper) => (
            <SearchResultCard
              key={paper.arxiv_id}
              paper={paper}
              onAdd={(list, readAt) => handleAdd(paper, list, readAt)}
            />
          ))}
        </div>
      )}

      {!loading && !error && results.length === 0 && query && (
        <div className="text-center py-12">
          <p className="text-sm text-stone-500">
            No results found. Try a different search term.
          </p>
        </div>
      )}
    </div>
  );
}
