"use client";

import { useState } from "react";
import { Task } from "@/types/task";
import { formatEstimate } from "@/lib/time";

type Props = {
  task: Task;
  onToggle: (id: string) => void;
  onSchedule: (id: string, start: string, end: string, date: string) => void;
  onScheduleAllDay: (id: string, date: string) => void;
  onOpenDetail: (id: string) => void;
};

export default function BacklogTaskItem({ task, onToggle, onSchedule, onScheduleAllDay, onOpenDetail }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isAllDay, setIsAllDay] = useState(false);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("text/plain", task.id);
    if (task.estimatedMinutes) {
      e.dataTransfer.setData("application/x-estimate", String(task.estimatedMinutes));
    }
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
      <div
        className={`flex items-center gap-3 px-4 py-2.5 ${!task.completed ? "cursor-grab active:cursor-grabbing" : ""}`}
        draggable={!task.completed}
        onDragStart={handleDragStart}
      >
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
        {task.estimatedMinutes != null && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
            {formatEstimate(task.estimatedMinutes)}
          </span>
        )}
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
        <div className="flex flex-col gap-2 px-4 pb-2.5 pl-11">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-xs border border-zinc-300 dark:border-zinc-600 rounded px-1.5 py-1 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
            />
            <label className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="rounded border-zinc-300 dark:border-zinc-600"
              />
              All day
            </label>
          </div>
          {!isAllDay && (
            <div className="flex items-center gap-2">
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
            </div>
          )}
          <div>
            <button
              onClick={() => {
                if (isAllDay) {
                  onScheduleAllDay(task.id, date);
                } else {
                  onSchedule(task.id, start, end, date);
                }
                setShowPicker(false);
              }}
              className="text-xs bg-blue-500 text-white rounded px-2 py-1 hover:bg-blue-600 transition-colors font-medium"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
