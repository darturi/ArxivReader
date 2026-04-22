"use client";

import { useState } from "react";
import Link from "next/link";
import { SearchResultPaper } from "@/lib/hooks";
import AddToReadButton from "./AddToReadButton";

interface SearchResultCardProps {
  paper: SearchResultPaper;
  onAdd: (list: "read" | "to_read", readAt?: string) => void;
}

export default function SearchResultCard({ paper, onAdd }: SearchResultCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
      {/* Collapsed header — always visible */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-4 cursor-pointer hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-stone-900 leading-snug">
              {paper.title}
            </h3>
            <p className={`text-xs text-stone-500 mt-1 ${expanded ? "" : "line-clamp-1"}`}>
              {paper.authors.map((author, i) => (
                <span key={`${author}-${i}`}>
                  {i > 0 && ", "}
                  <Link
                    href={`/author/${encodeURIComponent(author)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-stone-800 hover:underline"
                  >
                    {author}
                  </Link>
                </span>
              ))}
              {paper.published_at && (
                <span className="ml-1">
                  · {new Date(paper.published_at).getFullYear()}
                </span>
              )}
            </p>
            {!expanded && (
              <p className="text-xs text-stone-500 mt-2 line-clamp-2">
                {paper.abstract}
              </p>
            )}
          </div>
          <svg
            className={`w-4 h-4 text-stone-400 flex-shrink-0 mt-1 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-stone-100">
          {/* Published date */}
          {paper.published_at && (
            <p className="text-xs text-stone-400 mb-3">
              Published{" "}
              {new Date(paper.published_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}

          {/* ArXiv link */}
          <a
            href={paper.arxiv_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-3"
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

          {/* Full abstract */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
              Abstract
            </h4>
            <p className="text-sm text-stone-700 leading-relaxed">
              {paper.abstract}
            </p>
          </div>

          {/* Add buttons */}
          <div className="pt-2 border-t border-stone-100">
            <AddToReadButton
              userList={paper.user_list}
              onAdd={onAdd}
            />
          </div>
        </div>
      )}

      {/* Add buttons — show inline when collapsed */}
      {!expanded && (
        <div className="px-4 pb-3">
          <AddToReadButton
            userList={paper.user_list}
            onAdd={onAdd}
          />
        </div>
      )}
    </div>
  );
}
