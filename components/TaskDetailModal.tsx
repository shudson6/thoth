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
  onReschedule?: (
    id: string,
    date: string,
    start: string | undefined,
    end: string | undefined
  ) => void;
};

function formatScheduledDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export default function TaskDetailModal({ task, groups, onClose, onUpdate, onCreateGroup, onDeschedule, onReschedule }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [points, setPoints] = useState(task.points?.toString() ?? "");
  const [estimate, setEstimate] = useState(task.estimatedMinutes?.toString() ?? "");
  const [groupId, setGroupId] = useState<string | null>(task.groupId ?? null);
  const [scheduledDate, setScheduledDate] = useState(task.scheduledDate ?? "");
  const [scheduledStart, setScheduledStart] = useState(task.scheduledStart ?? "");
  const [scheduledEnd, setScheduledEnd] = useState(task.scheduledEnd ?? "");
  const [isAllDay, setIsAllDay] = useState(!task.scheduledStart && !task.scheduledEnd);

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
    setScheduledDate(task.scheduledDate ?? "");
    setScheduledStart(task.scheduledStart ?? "");
    setScheduledEnd(task.scheduledEnd ?? "");
    setIsAllDay(!task.scheduledStart && !task.scheduledEnd);
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

    if (onReschedule && scheduledDate) {
      const newStart = isAllDay ? undefined : scheduledStart || undefined;
      const newEnd = isAllDay ? undefined : scheduledEnd || undefined;
      const dateChanged = scheduledDate !== task.scheduledDate;
      const startChanged = newStart !== task.scheduledStart;
      const endChanged = newEnd !== task.scheduledEnd;
      if (dateChanged || startChanged || endChanged) {
        onReschedule(task.id, scheduledDate, newStart, newEnd);
      }
    }

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
            {onReschedule && task.scheduledDate && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Schedule
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isAllDay}
                    onChange={(e) => setIsAllDay(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-600"
                  />
                  All day
                </label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      Start
                    </label>
                    <input
                      type="time"
                      value={scheduledStart}
                      onChange={(e) => setScheduledStart(e.target.value)}
                      disabled={isAllDay}
                      className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      End
                    </label>
                    <input
                      type="time"
                      value={scheduledEnd}
                      onChange={(e) => setScheduledEnd(e.target.value)}
                      disabled={isAllDay}
                      className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
                    />
                  </div>
                </div>
              </div>
            )}
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
            {task.scheduledDate && (
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
                  <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
                </svg>
                <span>{formatScheduledDate(task.scheduledDate)}</span>
                <span>·</span>
                <span>
                  {task.scheduledStart && task.scheduledEnd
                    ? `${formatTime(task.scheduledStart)} – ${formatTime(task.scheduledEnd)}`
                    : "All day"}
                </span>
              </div>
            )}
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
