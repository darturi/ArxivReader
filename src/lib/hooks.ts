"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { UserPaperWithDetails, Tag, PaperResult } from "@/lib/types";

// ---- Fetching hooks ----

const PAGE_SIZE = 50;

export function usePapers(list: "read" | "to_read") {
  const [papers, setPapers] = useState<UserPaperWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/papers?list=${list}&limit=${PAGE_SIZE}&offset=0`);
      if (!res.ok) throw new Error("Failed to fetch papers");
      const data = await res.json();
      setPapers(data.papers);
      setHasMore(data.papers.length >= PAGE_SIZE);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [list]);

  const fetchMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/papers?list=${list}&limit=${PAGE_SIZE}&offset=${papers.length}`);
      if (!res.ok) throw new Error("Failed to fetch papers");
      const data = await res.json();
      setPapers((prev) => [...prev, ...data.papers]);
      setHasMore(data.papers.length >= PAGE_SIZE);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoadingMore(false);
    }
  }, [list, papers.length, loadingMore, hasMore]);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  return { papers, loading, loadingMore, error, hasMore, refetch: fetchPapers, fetchMore };
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      if (!res.ok) return;
      const data = await res.json();
      setTags(data.tags);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  return { tags, loading, refetch: fetchTags };
}

// ---- Search ----

export interface SearchResultPaper extends PaperResult {
  user_list: string | null;
}

// Client-side search cache — persists across page refreshes via sessionStorage
const SEARCH_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const CACHE_STORAGE_KEY = "arxiv-search-cache";

type CacheEntry = { papers: SearchResultPaper[]; remaining: number; ts: number };

function getSearchCache(): Map<string, CacheEntry> {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = sessionStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return new Map();
    const entries: [string, CacheEntry][] = JSON.parse(raw);
    return new Map(entries);
  } catch {
    return new Map();
  }
}

function setSearchCache(cache: Map<string, CacheEntry>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify([...cache]));
  } catch {
    // storage full or unavailable — silent
  }
}

export function useSearch() {
  const [results, setResults] = useState<SearchResultPaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const search = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) return;

    // Check client-side cache first
    const cacheKey = q.toLowerCase();
    const searchCache = getSearchCache();
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < SEARCH_CACHE_TTL) {
      setResults(cached.papers);
      setRemaining(cached.remaining);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}`
      );
      if (res.status === 429) {
        setError("Rate limit reached. Please try again later.");
        setRemaining(0);
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Search failed");
      }
      const data = await res.json();
      setResults(data.papers);
      setRemaining(data.remaining);

      // Store in cache
      searchCache.set(cacheKey, {
        papers: data.papers,
        remaining: data.remaining,
        ts: Date.now(),
      });
      setSearchCache(searchCache);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, remaining, search, setResults };
}

// ---- Debounced save ----

export function useDebouncedSave(
  paperId: string,
  delay: number = 500
) {
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const timerRef = useRef<NodeJS.Timeout>(undefined);

  const saveNotes = useCallback(
    (notes: string) => {
      setSaveStatus("saving");
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/papers/${paperId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notes }),
          });
          if (res.ok) {
            setSaveStatus("saved");
            setTimeout(() => setSaveStatus("idle"), 2000);
          }
        } catch {
          setSaveStatus("idle");
        }
      }, delay);
    },
    [paperId, delay]
  );

  return { saveStatus, saveNotes };
}
