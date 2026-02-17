"use client";

import { useState, useEffect } from "react";
import { Task, Group } from "@/types/task";
import { formatEstimate } from "@/lib/time";
import GroupPicker from "./GroupPicker";

type Props = {
  task: Task;
  groups: Group[];
  onClose: () => void;
  onUpdate: (
    id: string,
    updates: Partial<Pick<Task, "title" | "description" | "points" | "estimatedMinutes" | "groupId">>
  ) => void;
  onCreateGroup: (name: string, color: string) => void;
  onDeschedule?: (id: string) => void;
};

export default function TaskDetailModal({ task, groups, onClose, onUpdate, onCreateGroup, onDeschedule }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [points, setPoints] = useState(task.points?.toString() ?? "");
  const [estimate, setEstimate] = useState(task.estimatedMinutes?.toString() ?? "");
  const [groupId, setGroupId] = useState<string | null>(task.groupId ?? null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function startEditing() {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPoints(task.points?.toString() ?? "");
    setEstimate(task.estimatedMinutes?.toString() ?? "");
    setGroupId(task.groupId ?? null);
    setEditing(true);
  }

  function handleSave() {
    const updates: Partial<Pick<Task, "title" | "description" | "points" | "estimatedMinutes" | "groupId">> = {};
    const trimmedTitle = title.trim();
    if (trimmedTitle && trimmedTitle !== task.title) updates.title = trimmedTitle;
    if (description !== (task.description ?? "")) updates.description = description || undefined;
    const parsedPoints = points ? Number(points) : undefined;
    if (parsedPoints !== task.points) updates.points = parsedPoints;
    const parsedEstimate = estimate ? Number(estimate) : undefined;
    if (parsedEstimate !== task.estimatedMinutes) updates.estimatedMinutes = parsedEstimate;
    const newGroupId = groupId ?? undefined;
    if (newGroupId !== task.groupId) updates.groupId = newGroupId;
    if (Object.keys(updates).length > 0) onUpdate(task.id, updates);
    setEditing(false);
  }

  function handleCancel() {
    setEditing(false);
  }

  const taskGroup = groups.find((g) => g.id === task.groupId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-md bg-white dark:bg-zinc-900 shadow-lg border border-zinc-200 dark:border-zinc-700 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-right controls */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {!editing && (
            <button
              onClick={startEditing}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              title="Edit task"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            title="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Points
                </label>
                <input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  min={0}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Estimate (min)
                </label>
                <input
                  type="number"
                  value={estimate}
                  onChange={(e) => setEstimate(e.target.value)}
                  min={1}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Group
              </label>
              <GroupPicker
                groups={groups}
                selectedGroupId={groupId}
                onChange={setGroupId}
                onCreateGroup={onCreateGroup}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={handleCancel}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="rounded-md bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pr-12">
            <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
              {task.title}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
              {task.description || (
                <span className="italic text-zinc-400 dark:text-zinc-500">
                  No description
                </span>
              )}
            </p>
            <div className="flex gap-2 flex-wrap">
              {taskGroup && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: taskGroup.color }}
                >
                  {taskGroup.name}
                </span>
              )}
              {task.points != null && (
                <span className="inline-block rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {task.points} pts
                </span>
              )}
              {task.estimatedMinutes != null && (
                <span className="inline-block rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {formatEstimate(task.estimatedMinutes)}
                </span>
              )}
            </div>
            {task.scheduledDate && onDeschedule && (
              <button
                onClick={() => { onDeschedule(task.id); onClose(); }}
                className="text-xs font-medium text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                Move to Backlog
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
