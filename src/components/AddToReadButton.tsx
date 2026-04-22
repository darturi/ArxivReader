"use client";

import { useState } from "react";

interface AddToReadButtonProps {
  onAdd: (list: "read" | "to_read", readAt?: string) => void;
  userList: string | null;
}

export default function AddToReadButton({ onAdd, userList }: AddToReadButtonProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [readDate, setReadDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });

  if (userList) {
    return (
      <span className="text-xs text-stone-400 py-1.5">
        Added to {userList === "read" ? "Read" : "To Read"}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {!showDatePicker ? (
        <>
          <button
            onClick={() => setShowDatePicker(true)}
            className="text-xs px-3 py-1.5 rounded-md bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
          >
            Add to Read
          </button>
          <button
            onClick={() => onAdd("to_read")}
            className="text-xs px-3 py-1.5 rounded-md bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
          >
            Add to To Read
          </button>
        </>
      ) : (
        <>
          <input
            type="date"
            value={readDate}
            onChange={(e) => setReadDate(e.target.value)}
            className="text-xs px-2 py-1.5 border border-stone-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
          />
          <button
            onClick={() => {
              onAdd("read", readDate);
              setShowDatePicker(false);
            }}
            className="text-xs px-3 py-1.5 rounded-md bg-stone-900 text-white hover:bg-stone-800 transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => {
              onAdd("read");
              setShowDatePicker(false);
            }}
            className="text-xs px-2 py-1.5 text-stone-400 hover:text-stone-600"
          >
            Skip date
          </button>
          <button
            onClick={() => setShowDatePicker(false)}
            className="text-xs px-2 py-1.5 text-stone-400 hover:text-stone-600"
          >
            Cancel
          </button>
        </>
      )}
    </div>
  );
}
