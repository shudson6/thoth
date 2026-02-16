"use client";

import { useState } from "react";

type Props = {
  onAdd: (title: string, points?: number) => void;
  onCancel: () => void;
};

export default function AddTaskForm({ onAdd, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed, points ? Number(points) : undefined);
    setTitle("");
    setPoints("");
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-b border-zinc-200 dark:border-zinc-700 space-y-3">
      <input
        autoFocus
        type="text"
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
      <input
        type="number"
        placeholder="Points (optional)"
        min={0}
        value={points}
        onChange={(e) => setPoints(e.target.value)}
        className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
