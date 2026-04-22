"use client";

import { useState } from "react";
import { useTags } from "@/lib/hooks";

export default function TagManager() {
  const { tags, loading, refetch } = useTags();
  const [newTagName, setNewTagName] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newTagName.trim()) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTagName.trim() }),
    });
    if (res.ok) {
      setNewTagName("");
      refetch();
    }
  };

  const handleDelete = async (tagId: string) => {
    if (deleting === tagId) {
      // Second click — confirm delete
      await fetch(`/api/tags/${tagId}`, { method: "DELETE" });
      setDeleting(null);
      refetch();
    } else {
      setDeleting(tagId);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-lg font-semibold text-stone-900 mb-6">Tags</h1>

      {/* Create tag */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="New tag name..."
          className="flex-1 text-sm px-4 py-2.5 border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent"
        />
        <button
          onClick={handleCreate}
          disabled={!newTagName.trim()}
          className="px-5 py-2.5 text-sm font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Create
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 rounded-lg bg-stone-100 animate-pulse"
            />
          ))}
        </div>
      ) : tags.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-stone-500">
            No tags yet. Create one above to start organizing your papers.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-stone-50"
            >
              <span className="text-sm text-stone-700">{tag.name}</span>
              <button
                onClick={() => handleDelete(tag.id)}
                onBlur={() => setDeleting(null)}
                className={`text-xs px-3 py-1 rounded-md transition-colors ${
                  deleting === tag.id
                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                    : "text-stone-400 hover:text-red-600 hover:bg-red-50"
                }`}
              >
                {deleting === tag.id
                  ? "Click again to confirm"
                  : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
