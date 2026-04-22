"use client";

import Link from "next/link";
import { UserPaperWithDetails, Tag } from "@/lib/types";
import TagPill from "./TagPill";
import Highlight from "./Highlight";

interface PaperCardProps {
  paper: UserPaperWithDetails;
  onClick: () => void;
  highlightQuery?: string;
}

export default function PaperCard({ paper, onClick, highlightQuery = "" }: PaperCardProps) {
  const year = paper.published_at
    ? new Date(paper.published_at).getFullYear()
    : null;

  return (
    <div
      onClick={onClick}
      className="w-full text-left p-4 rounded-lg border border-stone-200 hover:border-stone-300 bg-white transition-colors cursor-pointer"
    >
      <h3 className="text-sm font-semibold text-stone-900 leading-snug">
        <Highlight text={paper.title} query={highlightQuery} />
      </h3>
      <p className="text-xs text-stone-500 mt-1 line-clamp-1">
        {paper.authors.map((author, i) => (
          <span key={`${author}-${i}`}>
            {i > 0 && ", "}
            <Link
              href={`/author/${encodeURIComponent(author)}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-stone-800 hover:underline"
            >
              <Highlight text={author} query={highlightQuery} />
            </Link>
          </span>
        ))}
        {year && <span className="ml-1">· {year}</span>}
        {paper.read_at && (
          <span className="ml-1">
            · Read{" "}
            {new Date(paper.read_at + "T00:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        )}
      </p>
      {paper.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {paper.tags.map((tag: Tag) => (
            <TagPill key={tag.id} name={tag.name} />
          ))}
        </div>
      )}
    </div>
  );
}
