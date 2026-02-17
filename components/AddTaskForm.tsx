"use client";

import { useState } from "react";
import { Group } from "@/types/task";
import GroupPicker from "./GroupPicker";

type Props = {
  groups: Group[];
  defaultGroupId?: string;
  onAdd: (title: string, points?: number, description?: string, estimatedMinutes?: number, groupId?: string) => void;
  onCancel: () => void;
  onCreateGroup: (name: string, color: string) => void;
};

export default function AddTaskForm({ groups, defaultGroupId, onAdd, onCancel, onCreateGroup }: Props) {
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState("");
  const [description, setDescription] = useState("");
  const [estimate, setEstimate] = useState("");
  const [groupId, setGroupId] = useState<string | null>(defaultGroupId ?? null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(
      trimmed,
      points ? Number(points) : undefined,
      description.trim() || undefined,
      estimate ? Number(estimate) : undefined,
      groupId ?? undefined
    );
    setTitle("");
    setPoints("");
    setDescription("");
    setEstimate("");
    if (!defaultGroupId) setGroupId(null);
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
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
      />
      <div className="flex gap-3">
        <input
          type="number"
          placeholder="Points"
          min={0}
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <input
          type="number"
          placeholder="Estimate (min)"
          min={1}
          value={estimate}
          onChange={(e) => setEstimate(e.target.value)}
          className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <GroupPicker
        groups={groups}
        selectedGroupId={groupId}
        onChange={setGroupId}
        onCreateGroup={onCreateGroup}
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
