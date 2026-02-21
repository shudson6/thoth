"use client";

import { useState } from "react";
import { Task } from "@/types/task";

type Props = {
  tasks: Task[];
  date: string;
  groupColorMap: Record<string, string>;
  onPlanForDate: (taskId: string) => void;
  onCopyPlanForDate?: (taskId: string) => void;
  onCreateException: (parentId: string, originalDate: string) => void;
  onToggleComplete: (task: Task) => void;
  onOpenDetail: (taskId: string) => void;
};

export default function DueTodayStrip({
  tasks,
  groupColorMap,
  onPlanForDate,
  onCopyPlanForDate,
  onCreateException,
  onToggleComplete,
  onOpenDetail,
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [copyMode, setCopyMode] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    const isCopy = e.ctrlKey || e.metaKey;
    e.dataTransfer.dropEffect = isCopy ? "copy" : "move";
    setCopyMode(isCopy);
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragOver(false);
      setCopyMode(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const isVirtual = e.dataTransfer.getData("application/x-is-virtual") === "1";
    const parentId = e.dataTransfer.getData("application/x-parent-id");
    const originalDate = e.dataTransfer.getData("application/x-original-date");
    const isCopy = e.ctrlKey || e.metaKey;

    if (isVirtual && parentId && originalDate) {
      onCreateException(parentId, originalDate);
    } else if (isCopy) {
      onCopyPlanForDate?.(taskId);
    } else {
      onPlanForDate(taskId);
    }

    setDragOver(false);
    setCopyMode(false);
  }

  return (
    <section
      aria-label="Due today"
      className={`flex-1 min-h-7 flex items-center gap-2 flex-wrap px-2 py-1 border-l transition-colors ${
        dragOver && copyMode
          ? "border-green-400 bg-green-50 dark:bg-green-500/10"
          : dragOver
          ? "border-blue-400 bg-blue-50 dark:bg-blue-500/10"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {tasks.length === 0 && !dragOver && (
        <span className="text-xs text-zinc-300 dark:text-zinc-600 select-none">Drop here</span>
      )}
      <ul className="contents">
      {tasks.map((task) => {
        const color = task.groupId ? groupColorMap[task.groupId] : undefined;
        return (
          <li
            key={task.id}
            className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-xs border transition-colors max-w-[180px] ${
              task.completed
                ? "opacity-50 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600"
            }`}
            style={color ? { borderColor: color + "60", backgroundColor: color + "12" } : undefined}
            draggable={!task.completed}
            onDragStart={task.completed ? undefined : (e) => {
              e.dataTransfer.setData("text/plain", task.id);
              e.dataTransfer.setData("application/x-source", "duetoday");
              e.dataTransfer.setData("application/x-estimate", String(task.estimatedMinutes ?? 60));
              if (task.isVirtualRecurrence) {
                e.dataTransfer.setData("application/x-is-virtual", "1");
                e.dataTransfer.setData("application/x-parent-id", task.id);
                e.dataTransfer.setData("application/x-original-date", task.scheduledDate!);
              }
              e.dataTransfer.effectAllowed = "move";
            }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onToggleComplete(task); }}
              className={`w-3.5 h-3.5 shrink-0 rounded border flex items-center justify-center transition-colors ${
                task.completed
                  ? "bg-zinc-400 dark:bg-zinc-500 border-zinc-400 dark:border-zinc-500"
                  : "border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500"
              }`}
              aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
            >
              {task.completed && (
                <svg viewBox="0 0 10 10" className="w-2 h-2 text-white fill-current">
                  <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <button
              onClick={() => onOpenDetail(task.id)}
              className={`truncate text-left text-zinc-700 dark:text-zinc-300 ${task.completed ? "line-through" : ""}`}
              style={color ? { color } : undefined}
            >
              {task.title}
            </button>
          </li>
        );
      })}
      </ul>
    </section>
  );
}
