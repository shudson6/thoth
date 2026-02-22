"use client";

import { useState } from "react";
import { Task } from "@/types/task";
import { formatEstimate, timeToMinutes, minutesToTime } from "@/lib/time";

type Props = Readonly<{
  task: Task;
  onSchedule: (id: string, start: string, end: string, date: string) => void;
  onScheduleAllDay: (id: string, date: string) => void;
  onOpenDetail: (id: string) => void;
  onScheduleCopy: (id: string, start: string, end: string, date: string) => void;
  onScheduleAllDayCopy: (id: string, date: string) => void;
}>;

export default function BacklogTaskItem({ task, onSchedule, onScheduleAllDay, onOpenDetail, onScheduleCopy, onScheduleAllDayCopy }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [isAllDay, setIsAllDay] = useState(false);
  const [keepInBacklog, setKeepInBacklog] = useState(false);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState(() =>
    minutesToTime(9 * 60 + (task.estimatedMinutes ?? 60))
  );

  function handleStartChange(newStart: string) {
    const oldStartMin = timeToMinutes(start);
    const newStartMin = timeToMinutes(newStart);
    if (task.estimatedMinutes == null) {
      const delta = newStartMin - oldStartMin;
      const newEndMin = Math.min(Math.max(timeToMinutes(end) + delta, newStartMin), 24 * 60 - 1);
      setEnd(minutesToTime(newEndMin));
    } else {
      setEnd(minutesToTime(Math.min(newStartMin + task.estimatedMinutes, 24 * 60 - 1)));
    }
    setStart(newStart);
  }

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("text/plain", task.id);
    if (task.estimatedMinutes) {
      e.dataTransfer.setData("application/x-estimate", String(task.estimatedMinutes));
    }
    e.dataTransfer.effectAllowed = "copyMove";
  }

  return (
    <li className="border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
      <div
        className={`flex items-center gap-3 px-4 py-2.5 ${task.completed ? "" : "cursor-grab active:cursor-grabbing"}`}
        draggable={!task.completed}
        onDragStart={handleDragStart}
      >
        <button
          className="flex-1 min-w-0 text-left hover:opacity-75 transition-opacity"
          onClick={() => onOpenDetail(task.id)}
        >
          <span className="text-sm text-zinc-800 dark:text-zinc-200">
            {task.title}
          </span>
          {task.description && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
              {task.description}
            </p>
          )}
        </button>
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
        <div className="flex flex-col gap-2 px-4 pb-2.5">
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
              <span>All day</span>
            </label>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={keepInBacklog}
              onChange={(e) => setKeepInBacklog(e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-600"
            />
            <span>Keep in backlog</span>
            <span className="hidden md:inline text-zinc-400">(Ctrl+drag)</span>
          </label>
          {!isAllDay && (
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={start}
                onChange={(e) => handleStartChange(e.target.value)}
                className="text-xs border border-zinc-300 dark:border-zinc-600 rounded px-1.5 py-1 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
              />
              <span className="text-xs text-zinc-400">–</span>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                disabled={task.estimatedMinutes != null}
                className="text-xs border border-zinc-300 dark:border-zinc-600 rounded px-1.5 py-1 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 disabled:opacity-40"
              />
            </div>
          )}
          <div>
            <button
              onClick={() => {
                if (isAllDay) {
                  if (keepInBacklog) {
                    onScheduleAllDayCopy(task.id, date);
                  } else {
                    onScheduleAllDay(task.id, date);
                  }
                } else {
                  if (keepInBacklog) {
                    onScheduleCopy(task.id, start, end, date);
                  } else {
                    onSchedule(task.id, start, end, date);
                  }
                }
                setShowPicker(false);
              }}
              className="text-xs bg-blue-500 text-white rounded px-2 py-1 hover:bg-blue-600 transition-colors font-medium"
            >
              {keepInBacklog ? "Schedule a copy" : "Schedule"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
