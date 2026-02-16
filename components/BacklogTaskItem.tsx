"use client";

import { useState } from "react";
import { Task } from "@/types/task";

type Props = {
  task: Task;
  onToggle: (id: string) => void;
  onSchedule: (id: string, start: string, end: string) => void;
  onOpenDetail: (id: string) => void;
};

export default function BacklogTaskItem({ task, onToggle, onSchedule, onOpenDetail }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");

  return (
    <div className="border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task.id)}
          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 accent-blue-500 shrink-0 cursor-pointer"
        />
        <div
          className="flex-1 min-w-0 cursor-pointer hover:opacity-75 transition-opacity"
          onClick={() => onOpenDetail(task.id)}
        >
          <span
            className={`text-sm ${
              task.completed
                ? "line-through text-zinc-400 dark:text-zinc-600"
                : "text-zinc-800 dark:text-zinc-200"
            }`}
          >
            {task.title}
          </span>
          {task.description && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
              {task.description}
            </p>
          )}
        </div>
        {task.points != null && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
            {task.points} pts
          </span>
        )}
        {!task.completed && (
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="text-xs text-blue-500 hover:text-blue-600 font-medium shrink-0"
          >
            Schedule
          </button>
        )}
      </div>
      {showPicker && (
        <div className="flex items-center gap-2 px-4 pb-2.5 pl-11">
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="text-xs border border-zinc-300 dark:border-zinc-600 rounded px-1.5 py-1 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <span className="text-xs text-zinc-400">–</span>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="text-xs border border-zinc-300 dark:border-zinc-600 rounded px-1.5 py-1 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
          />
          <button
            onClick={() => {
              onSchedule(task.id, start, end);
              setShowPicker(false);
            }}
            className="text-xs bg-blue-500 text-white rounded px-2 py-1 hover:bg-blue-600 transition-colors font-medium"
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  );
}
