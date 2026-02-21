"use client";

import { useState } from "react";

type Props = Readonly<{
  onThisOnly: () => void;
  onAll: () => void;
  onCancel: () => void;
}>;

export default function RecurrenceScopeDialog({ onThisOnly, onAll, onCancel }: Props) {
  const [scope, setScope] = useState<"this" | "all">("this");

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4 mt-2 space-y-3">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Update recurring task?
      </p>
      <div className="space-y-2">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="radio"
            name="scope"
            value="this"
            checked={scope === "this"}
            onChange={() => setScope("this")}
            className="accent-blue-500"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">Just this occurrence</span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="radio"
            name="scope"
            value="all"
            checked={scope === "all"}
            onChange={() => setScope("all")}
            className="accent-blue-500"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">All occurrences</span>
        </label>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={scope === "this" ? onThisOnly : onAll}
          className="rounded-md bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
        >
          Update
        </button>
      </div>
    </div>
  );
}
