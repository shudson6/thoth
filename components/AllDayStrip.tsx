"use client";

import { useState } from "react";
import { Task } from "@/types/task";

type Props = {
  tasks: Task[];
  groupColorMap: Record<string, string>;
  onScheduleAllDay: (taskId: string) => void;
  onCopyAllDay?: (taskId: string) => void;
  onOpenDetail: (id: string) => void;
};

export default function AllDayStrip({ tasks, groupColorMap, onScheduleAllDay, onCopyAllDay, onOpenDetail }: Props) {
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
    if (e.ctrlKey || e.metaKey) {
      onCopyAllDay?.(taskId);
    } else {
      onScheduleAllDay(taskId);
    }
    setDragOver(false);
    setCopyMode(false);
  }

  return (
    <section
      aria-label="All-day tasks"
      className={`flex-1 min-h-[40px] flex items-center gap-2 flex-wrap px-2 py-1 border-l transition-colors ${
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
      {tasks.map((task) => {
        const color = task.groupId ? groupColorMap[task.groupId] : undefined;
        return (
          <button
            key={task.id}
            onClick={() => onOpenDetail(task.id)}
            draggable={!task.completed}
            onDragStart={task.completed ? undefined : (e) => {
              e.dataTransfer.setData("text/plain", task.id);
              e.dataTransfer.setData("application/x-source", "allday");
              e.dataTransfer.setData("application/x-estimate", String(task.estimatedMinutes ?? 60));
              e.dataTransfer.effectAllowed = "move";
            }}
            className={`rounded-full px-3 py-0.5 text-xs font-medium transition-colors hover:opacity-80 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 ${task.completed ? "opacity-50 line-through cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
            style={color ? { backgroundColor: color + "30", color } : undefined}
          >
            {task.title}
          </button>
        );
      })}
    </section>
  );
}
