"use client";

import { useState } from "react";
import { usePapers, useTags } from "@/lib/hooks";
import { UserPaperWithDetails } from "@/lib/types";
import { getTagColor } from "@/lib/tag-colors";
import PaperCard from "./PaperCard";
import PaperDetail from "./PaperDetail";

interface PaperListProps {
  list: "read" | "to_read";
  title: string;
  emptyMessage: string;
}

export default function PaperList({
  list,
  title,
  emptyMessage,
}: PaperListProps) {
  const { papers, loading, loadingMore, error, hasMore, refetch, fetchMore } = usePapers(list);
  const { tags } = useTags();
  const [selectedPaper, setSelectedPaper] =
    useState<UserPaperWithDetails | null>(null);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleFilter = (tagId: string) => {
    setFilterTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const query = searchQuery.toLowerCase().trim();

  const filteredPapers = papers.filter((p) => {
    // Tag filter
    if (
      filterTags.length > 0 &&
      !filterTags.every((tagId) => p.tags.some((t) => t.id === tagId))
    ) {
      return false;
    }
    // Text search — matches title or any author name
    if (
      query &&
      !p.title.toLowerCase().includes(query) &&
      !p.authors.some((a) => a.toLowerCase().includes(query))
    ) {
      return false;
    }
    return true;
  });

  const handleUpdate = (updatedPaper?: UserPaperWithDetails) => {
    if (updatedPaper) {
      // Optimistic update — sync the selected paper and the list immediately
      setSelectedPaper(updatedPaper);
    }
    // Background refresh: don't set loading=true so the list doesn't flash
    refetch(true);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-lg font-semibold text-stone-900 mb-6">{title}</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-lg bg-stone-100 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-lg font-semibold text-stone-900 mb-6">{title}</h1>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-lg font-semibold text-stone-900 mb-6">{title}</h1>

      {/* Search within list */}
      {papers.length > 0 && (
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by title or author..."
            className="w-full text-sm px-4 py-2 border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent"
          />
        </div>
      )}

      {/* Tag filter */}
      {tags.length > 0 && papers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {tags.map((tag) => {
            const color = getTagColor(tag.name);
            const isActive = filterTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => toggleFilter(tag.id)}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors font-medium ${
                  isActive ? "ring-2 ring-offset-1 ring-stone-400" : "hover:opacity-80"
                }`}
                style={{ backgroundColor: color.bg, color: color.text }}
              >
                {tag.name}
              </button>
            );
          })}
          {filterTags.length > 0 && (
            <button
              onClick={() => setFilterTags([])}
              className="text-xs px-2.5 py-1 text-stone-400 hover:text-stone-600"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {filteredPapers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-stone-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPapers.map((paper) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              onClick={() => setSelectedPaper(paper)}
              highlightQuery={searchQuery}
            />
          ))}
          {hasMore && !searchQuery && filterTags.length === 0 && (
            <div className="text-center py-4">
              <button
                onClick={fetchMore}
                disabled={loadingMore}
                className="text-sm text-stone-500 hover:text-stone-700 disabled:opacity-50"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}

      {selectedPaper && (
        <PaperDetail
          paper={selectedPaper}
          onClose={() => setSelectedPaper(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
