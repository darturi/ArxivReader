"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UserPaperWithDetails, Tag } from "@/lib/types";
import { useDebouncedSave, useTags } from "@/lib/hooks";
import TagPill from "./TagPill";

interface PaperDetailProps {
  paper: UserPaperWithDetails;
  onClose: () => void;
  onUpdate: (updatedPaper?: UserPaperWithDetails) => void;
}

export default function PaperDetail({
  paper,
  onClose,
  onUpdate,
}: PaperDetailProps) {
  const [notes, setNotes] = useState(paper.notes || "");
  const [readAt, setReadAt] = useState(paper.read_at || "");
  const [paperTags, setPaperTags] = useState<Tag[]>(paper.tags);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const { saveStatus, saveNotes } = useDebouncedSave(paper.id);
  const { tags: allTags, refetch: refetchTags } = useTags();

  useEffect(() => {
    setNotes(paper.notes || "");
    setReadAt(paper.read_at || "");
    setPaperTags(paper.tags);
  }, [paper]);

  // Notify parent whenever tags change so the card behind stays in sync
  const notifyTagUpdate = (newTags: Tag[]) => {
    onUpdate({ ...paper, tags: newTags });
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    saveNotes(value);
  };

  const handleReadAtChange = async (value: string) => {
    setReadAt(value);
    await fetch(`/api/papers/${paper.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read_at: value || null }),
    });
    onUpdate({ ...paper, read_at: value || null });
  };

  const otherList = paper.list === "read" ? "to_read" : "read";
  const otherListLabel = paper.list === "read" ? "To Read" : "Read";

  const handleMove = async () => {
    await fetch(`/api/papers/${paper.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ list: otherList }),
    });
    onUpdate();
  };

  const handleRemove = async () => {
    await fetch(`/api/papers/${paper.id}`, { method: "DELETE" });
    onUpdate();
    onClose();
  };

  const handleAddTag = async (tagId: string) => {
    await fetch(`/api/papers/${paper.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag_id: tagId }),
    });
    const tag = allTags.find((t) => t.id === tagId);
    if (tag) {
      const newTags = [...paperTags, tag];
      setPaperTags(newTags);
      notifyTagUpdate(newTags);
    }
    setShowTagPicker(false);
  };

  const handleRemoveTag = async (tagId: string) => {
    await fetch(`/api/papers/${paper.id}/tags/${tagId}`, {
      method: "DELETE",
    });
    const newTags = paperTags.filter((t) => t.id !== tagId);
    setPaperTags(newTags);
    notifyTagUpdate(newTags);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTagName.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      await refetchTags();
      await handleAddTag(data.tag.id);
      setNewTagName("");
    }
  };

  const availableTags = allTags.filter(
    (t) => !paperTags.some((pt) => pt.id === t.id)
  );

  return (
    <div className="fixed inset-0 bg-black/20 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 mr-4">
              <h2 className="text-lg font-semibold text-stone-900 leading-snug">
                {paper.title}
              </h2>
              <p className="text-sm text-stone-500 mt-1">
                {paper.authors.map((author, i) => (
                  <span key={`${author}-${i}`}>
                    {i > 0 && ", "}
                    <Link
                      href={`/author/${encodeURIComponent(author)}`}
                      className="hover:text-stone-800 hover:underline"
                      onClick={onClose}
                    >
                      {author}
                    </Link>
                  </span>
                ))}
              </p>
              {paper.published_at && (
                <p className="text-xs text-stone-400 mt-1">
                  Published{" "}
                  {new Date(paper.published_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 p-1"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* ArXiv link */}
          <a
            href={paper.arxiv_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4"
          >
            View on ArXiv
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>

          {/* Abstract */}
          <div className="mb-6">
            <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
              Abstract
            </h3>
            <p className="text-sm text-stone-700 leading-relaxed">
              {paper.abstract}
            </p>
          </div>

          {/* Tags */}
          <div className="mb-6">
            <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
              Tags
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {paperTags.map((tag) => (
                <TagPill
                  key={tag.id}
                  name={tag.name}
                  size="md"
                  onRemove={() => handleRemoveTag(tag.id)}
                />
              ))}
              <button
                onClick={() => setShowTagPicker(!showTagPicker)}
                className="text-xs px-2 py-1 rounded-full border border-dashed border-stone-300 text-stone-400 hover:text-stone-600 hover:border-stone-400"
              >
                + Add tag
              </button>
            </div>
            {showTagPicker && (
              <div className="mt-2 p-3 border border-stone-200 rounded-lg bg-stone-50">
                {availableTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {availableTags.map((tag) => (
                      <TagPill
                        key={tag.id}
                        name={tag.name}
                        size="md"
                        onClick={() => handleAddTag(tag.id)}
                      />
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New tag name..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                    className="flex-1 text-sm px-2 py-1 border border-stone-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                  />
                  <button
                    onClick={handleCreateTag}
                    className="text-xs px-3 py-1 bg-stone-900 text-white rounded hover:bg-stone-800"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                Notes
              </h3>
              <span className="text-xs text-stone-400">
                {saveStatus === "saving"
                  ? "Saving..."
                  : saveStatus === "saved"
                  ? "Saved"
                  : ""}
              </span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add your notes about this paper..."
              rows={6}
              className="w-full text-sm p-3 border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-stone-400 resize-y"
            />
          </div>

          {/* Date read */}
          {paper.list === "read" && (
            <div className="mb-6">
              <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
                Date Read
              </h3>
              <input
                type="date"
                value={readAt}
                onChange={(e) => handleReadAtChange(e.target.value)}
                className="text-sm px-3 py-2 border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
              {readAt && (
                <button
                  onClick={() => handleReadAtChange("")}
                  className="ml-2 text-xs text-stone-400 hover:text-stone-600"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleMove}
              className="text-sm px-4 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors"
            >
              Move to {otherListLabel}
            </button>
            <button
              onClick={handleRemove}
              className="text-sm px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Remove from list
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
