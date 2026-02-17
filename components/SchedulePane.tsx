"use client";

import { useEffect, useRef, useState } from "react";
import { Task, Group } from "@/types/task";
import ScheduleTaskBlock from "./ScheduleTaskBlock";
import TaskDetailModal from "./TaskDetailModal";
import { timeToMinutes, minutesToTime } from "@/lib/time";

type Props = {
  tasks: Task[];
  groups: Group[];
  onUpdateTask: (
    id: string,
    updates: Partial<Pick<Task, "title" | "description" | "points" | "estimatedMinutes" | "groupId">>
  ) => void;
  selectedDate: string;
  onChangeDate: (date: string) => void;
  onScheduleTask: (id: string, start: string, end: string) => void;
  onScheduleTaskAllDay: (id: string) => void;
  onDescheduleTask: (id: string) => void;
  onRescheduleTask?: (id: string, date: string, start: string | undefined, end: string | undefined) => void;
  onCreateGroup: (name: string, color: string) => void;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const VISIBLE_HOURS = 16;
const SNAP_MINUTES = 15;

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

function snapToGrid(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

export default function SchedulePane({ tasks, groups, onUpdateTask, selectedDate, onChangeDate, onScheduleTask, onScheduleTaskAllDay, onDescheduleTask, onRescheduleTask, onCreateGroup }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragOffsetMinutes = useRef(0);
  const [rowHeight, setRowHeight] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [dragOverTime, setDragOverTime] = useState<number | null>(null);
  const [allDayDragOver, setAllDayDragOver] = useState(false);

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

  const allDayTasks = tasks.filter(
    (t) => t.scheduledDate === selectedDate && !t.scheduledStart && !t.completed
  );

  const groupColorMap: Record<string, string> = {};
  for (const g of groups) groupColorMap[g.id] = g.color;

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

  // --- DnD helpers for time grid ---
  function getMinutesFromY(e: React.DragEvent): number {
    if (!containerRef.current || rowHeight <= 0) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const relY = e.clientY - rect.top + containerRef.current.scrollTop;
    const minutes = (relY / totalHeight) * 24 * 60 - dragOffsetMinutes.current;
    return snapToGrid(Math.max(0, Math.min(minutes, 24 * 60 - SNAP_MINUTES)));
  }

  function handleGridDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTime(getMinutesFromY(e));
  }

  function handleGridDragLeave() {
    setDragOverTime(null);
  }

  function handleGridDrop(e: React.DragEvent) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const estimateStr = e.dataTransfer.getData("application/x-estimate");
    const estimate = estimateStr ? Number(estimateStr) : 60;

    const startMin = getMinutesFromY(e);
    const endMin = Math.min(startMin + estimate, 24 * 60);

    onScheduleTask(taskId, minutesToTime(startMin), minutesToTime(endMin));
    dragOffsetMinutes.current = 0;
    setDragOverTime(null);
  }

  // --- DnD helpers for all-day strip ---
  function handleAllDayDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setAllDayDragOver(true);
  }

  function handleAllDayDragLeave() {
    setAllDayDragOver(false);
  }

  function handleAllDayDrop(e: React.DragEvent) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    onScheduleTaskAllDay(taskId);
    dragOffsetMinutes.current = 0;
    setAllDayDragOver(false);
  }

  const dragPreviewTop = dragOverTime !== null && rowHeight > 0
    ? (dragOverTime / 60) * rowHeight
    : null;

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

      {/* All-day strip */}
      <div
        className={`shrink-0 border-b px-4 py-2 min-h-[40px] flex items-center gap-2 flex-wrap transition-colors ${
          allDayDragOver
            ? "border-blue-400 bg-blue-50 dark:bg-blue-500/10 border-dashed"
            : "border-zinc-200 dark:border-zinc-800"
        }`}
        onDragOver={handleAllDayDragOver}
        onDragLeave={handleAllDayDragLeave}
        onDrop={handleAllDayDrop}
      >
        <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0 select-none">All day</span>
        {allDayTasks.length === 0 && !allDayDragOver && (
          <span className="text-xs text-zinc-300 dark:text-zinc-600 select-none">Drop tasks here</span>
        )}
        {allDayTasks.map((task) => {
          const color = task.groupId ? groupColorMap[task.groupId] : undefined;
          return (
            <button
              key={task.id}
              onClick={() => setSelectedTaskId(task.id)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", task.id);
                e.dataTransfer.setData("application/x-source", "allday");
                e.dataTransfer.setData("application/x-estimate", String(task.estimatedMinutes ?? 60));
                e.dataTransfer.effectAllowed = "move";
              }}
              className="rounded-full px-3 py-0.5 text-xs font-medium transition-colors cursor-grab active:cursor-grabbing hover:opacity-80 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
              style={color ? { backgroundColor: color + "30", color } : undefined}
            >
              {task.title}
            </button>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto relative"
        onDragOver={handleGridDragOver}
        onDragLeave={handleGridDragLeave}
        onDrop={handleGridDrop}
      >
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

            {/* Drop preview */}
            {dragPreviewTop !== null && (
              <div
                className="absolute left-16 right-2 border-t-2 border-dashed border-blue-400 z-30 pointer-events-none"
                style={{ top: dragPreviewTop }}
              >
                <span className="absolute -top-4 left-0 text-[10px] font-medium text-blue-500 bg-white dark:bg-zinc-950 px-1 rounded">
                  {minutesToTime(dragOverTime!)}
                </span>
              </div>
            )}

            {/* Scheduled task blocks */}
            {scheduledTasks.map((task) => (
              <ScheduleTaskBlock
                key={task.id}
                task={task}
                rowHeight={rowHeight}
                groupColor={task.groupId ? groupColorMap[task.groupId] : undefined}
                onOpenDetail={setSelectedTaskId}
                onBlockDragStart={(offset) => { dragOffsetMinutes.current = offset; }}
              />
            ))}
          </div>
        )}
        {selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            groups={groups}
            onClose={() => setSelectedTaskId(null)}
            onUpdate={onUpdateTask}
            onCreateGroup={onCreateGroup}
            onDeschedule={onDescheduleTask}
            onReschedule={onRescheduleTask}
          />
        )}
      </div>
    </div>
  );
}
