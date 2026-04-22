"use client";

import { getTagColor } from "@/lib/tag-colors";

interface TagPillProps {
  name: string;
  onRemove?: () => void;
  onClick?: () => void;
  size?: "sm" | "md";
}

export default function TagPill({ name, onRemove, onClick, size = "sm" }: TagPillProps) {
  const color = getTagColor(name);
  const sizeClasses = size === "sm" ? "text-xs px-2 py-0.5" : "text-xs px-2 py-1";

  const pill = (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses}`}
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:opacity-70"
        >
          ×
        </button>
      )}
    </span>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="inline-flex">
        {pill}
      </button>
    );
  }

  return pill;
}
