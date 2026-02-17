"use client";

import { useEffect, useRef, useState } from "react";
import { Task } from "@/types/task";
import ScheduleTaskBlock from "./ScheduleTaskBlock";
import TaskDetailModal from "./TaskDetailModal";

type Props = {
  tasks: Task[];
  onUpdateTask: (
    id: string,
    updates: Partial<Pick<Task, "title" | "description" | "points">>
  ) => void;
  selectedDate: string;
  onChangeDate: (date: string) => void;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const VISIBLE_HOURS = 16;

function formatHour(h: number): string {
  const suffix = h >= 12 ? "PM" : "AM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display} ${suffix}`;
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function SchedulePane({ tasks, onUpdateTask, selectedDate, onChangeDate }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rowHeight, setRowHeight] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const selectedTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId) ?? null
    : null;

  useEffect(() => {
    function updateRowHeight() {
      if (containerRef.current) {
        const h = containerRef.current.clientHeight / VISIBLE_HOURS;
        if (h > 0) setRowHeight(h);
      }
    }
    updateRowHeight();
    window.addEventListener("resize", updateRowHeight);
    return () => window.removeEventListener("resize", updateRowHeight);
  }, []);

  // Auto-scroll to 6 AM on mount
  useEffect(() => {
    if (rowHeight > 0 && containerRef.current) {
      containerRef.current.scrollTop = rowHeight * 6;
    }
  }, [rowHeight]);

  const scheduledTasks = tasks.filter(
    (t) => t.scheduledStart && t.scheduledEnd && !t.completed && t.scheduledDate === selectedDate
  );

  // Current time indicator (only shown when viewing today)
  const isToday = selectedDate === new Date().toISOString().slice(0, 10);
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [timeOffset, setTimeOffset] = useState(currentMinutes);

  useEffect(() => {
    if (!isToday) return;
    const interval = setInterval(() => {
      const n = new Date();
      setTimeOffset(n.getHours() * 60 + n.getMinutes());
    }, 60_000);
    return () => clearInterval(interval);
  }, [isToday]);

  const totalHeight = rowHeight * 24;
  const timeIndicatorTop = rowHeight > 0 ? (timeOffset / 60) * rowHeight : 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Date navigation header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onChangeDate(shiftDate(selectedDate, -1))}
            className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
            aria-label="Previous day"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200 min-w-[120px] text-center">
            {formatDate(selectedDate)}
          </span>
          <button
            onClick={() => onChangeDate(shiftDate(selectedDate, 1))}
            className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
            aria-label="Next day"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        {!isToday && (
          <button
            onClick={() => onChangeDate(new Date().toISOString().slice(0, 10))}
            className="text-xs font-medium text-blue-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-500/10"
          >
            Today
          </button>
        )}
      </div>

      {/* Scrollable time grid */}
      <div ref={containerRef} className="flex-1 overflow-y-auto relative">
        {rowHeight > 0 && (
          <div className="relative" style={{ height: totalHeight }}>
            {/* Hour rows */}
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 border-b border-zinc-200 dark:border-zinc-800 flex items-start"
                style={{ top: h * rowHeight, height: rowHeight }}
              >
                <span className="w-16 shrink-0 text-xs text-zinc-400 pt-1 pl-3 select-none">
                  {formatHour(h)}
                </span>
              </div>
            ))}

            {/* Current time indicator */}
            {isToday && (
              <div
                className="absolute left-14 right-0 border-t-2 border-red-500 z-20 pointer-events-none"
                style={{ top: timeIndicatorTop }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 -mt-[6px] -ml-[5px]" />
              </div>
            )}

            {/* Scheduled task blocks */}
            {scheduledTasks.map((task) => (
              <ScheduleTaskBlock key={task.id} task={task} rowHeight={rowHeight} onOpenDetail={setSelectedTaskId} />
            ))}
          </div>
        )}
        {selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            onClose={() => setSelectedTaskId(null)}
            onUpdate={onUpdateTask}
          />
        )}
      </div>
    </div>
  );
}
