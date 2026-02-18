"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Task, Group } from "@/types/task";
import ScheduleTaskBlock from "./ScheduleTaskBlock";
import TaskDetailModal from "./TaskDetailModal";
import { timeToMinutes, minutesToTime } from "@/lib/time";

type ExceptionFields = {
  title?: string;
  description?: string | null;
  points?: number | null;
  estimatedMinutes?: number | null;
  groupId?: string | null;
  scheduledDate?: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  completed?: boolean;
  cancelled?: boolean;
};

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
  onSetRecurrence?: (taskId: string, rule: string | null) => void;
  onCreateException?: (parentId: string, originalDate: string, fields: ExceptionFields) => void;
  onUpdateAllOccurrences?: (masterId: string, updates: Partial<Task>) => void;
  onCancelOccurrence?: (parentId: string, originalDate: string) => void;
  onCopyTask?: (sourceId: string, date: string, start: string, end: string) => void;
  onCopyTaskAllDay?: (sourceId: string, date: string) => void;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const VISIBLE_HOURS = 16;
const SNAP_MINUTES = 15;
const MIN_BLOCK_PX = 28;

function formatHour(h: number): string {
  const suffix = h >= 12 ? "PM" : "AM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display} ${suffix}`;
}

function localDateStr(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return localDateStr(d);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function snapToGrid(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

function computeLayout(tasks: Task[], rowHeight: number): Map<string, { col: number; numCols: number }> {
  if (tasks.length === 0) return new Map();

  const pixelsPerMinute = rowHeight / 60;
  const minBlockMinutes = rowHeight > 0 ? Math.ceil(MIN_BLOCK_PX / pixelsPerMinute) : 30;

  const sorted = [...tasks].sort((a, b) =>
    timeToMinutes(a.scheduledStart!) - timeToMinutes(b.scheduledStart!)
  );

  // Greedy column assignment: place each task in the first column where
  // the previous occupant has already ended. Use effectiveEnd so that
  // visually-expanded short blocks don't collide with the next task.
  const colEnds: number[] = [];
  const taskCols = new Map<string, number>();
  for (const task of sorted) {
    const start       = timeToMinutes(task.scheduledStart!);
    const end         = timeToMinutes(task.scheduledEnd!);
    const effectiveEnd = Math.max(end, start + minBlockMinutes);
    let col = colEnds.findIndex((e) => e <= start);
    if (col === -1) col = colEnds.length;
    colEnds[col] = effectiveEnd;
    taskCols.set(task.id, col);
  }

  // Find clusters (maximal groups of transitively overlapping tasks) and
  // set numCols = max column index in the cluster + 1 for every member.
  const result = new Map<string, { col: number; numCols: number }>();
  const finalize = (from: number, to: number) => {
    let maxCol = 0;
    for (let i = from; i < to; i++) maxCol = Math.max(maxCol, taskCols.get(sorted[i].id)!);
    const numCols = maxCol + 1;
    for (let i = from; i < to; i++)
      result.set(sorted[i].id, { col: taskCols.get(sorted[i].id)!, numCols });
  };

  let clusterStart = 0;
  let clusterMaxEnd = 0;
  for (let i = 0; i < sorted.length; i++) {
    const start        = timeToMinutes(sorted[i].scheduledStart!);
    const end          = timeToMinutes(sorted[i].scheduledEnd!);
    const effectiveEnd = Math.max(end, start + minBlockMinutes);
    if (i === 0 || start >= clusterMaxEnd) {
      if (i > 0) finalize(clusterStart, i);
      clusterStart = i;
      clusterMaxEnd = effectiveEnd;
    } else {
      clusterMaxEnd = Math.max(clusterMaxEnd, effectiveEnd);
    }
  }
  finalize(clusterStart, sorted.length);

  return result;
}

export default function SchedulePane({ tasks, groups, onUpdateTask, selectedDate, onChangeDate, onScheduleTask, onScheduleTaskAllDay, onDescheduleTask, onRescheduleTask, onCreateGroup, onSetRecurrence, onCreateException, onUpdateAllOccurrences, onCancelOccurrence, onCopyTask, onCopyTaskAllDay }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragOffsetMinutes = useRef(0);
  const [rowHeight, setRowHeight] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [dragOverTime, setDragOverTime] = useState<number | null>(null);
  const [allDayDragOver, setAllDayDragOver] = useState(false);
  const [dragCopyMode, setDragCopyMode] = useState(false);

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
  const isToday = selectedDate === localDateStr();
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

  const layout = useMemo(() => computeLayout(scheduledTasks, rowHeight), [scheduledTasks, rowHeight]);

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
    const isCopy = e.ctrlKey || e.metaKey;
    e.dataTransfer.dropEffect = isCopy ? "copy" : "move";
    setDragCopyMode(isCopy);
    setDragOverTime(getMinutesFromY(e));
  }

  function handleGridDragLeave() {
    setDragOverTime(null);
    setDragCopyMode(false);
  }

  function handleGridDrop(e: React.DragEvent) {
    e.preventDefault();
    const taskId    = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const isCopy = e.ctrlKey || e.metaKey;
    const estimateStr = e.dataTransfer.getData("application/x-estimate");
    const estimate  = estimateStr ? Number(estimateStr) : 60;
    const isVirtual = e.dataTransfer.getData("application/x-is-virtual") === "1";
    const isException = e.dataTransfer.getData("application/x-is-exception") === "1";
    const origDate  = e.dataTransfer.getData("application/x-original-date");
    const parentId  = e.dataTransfer.getData("application/x-parent-id");

    const startMin = getMinutesFromY(e);
    const endMin = Math.min(startMin + estimate, 24 * 60);
    const newStart = minutesToTime(startMin);
    const newEnd   = minutesToTime(endMin);

    if (isCopy) {
      onCopyTask?.(taskId, selectedDate, newStart, newEnd);
    } else if ((isVirtual || isException) && onCreateException && origDate && parentId) {
      onCreateException(parentId, origDate, {
        scheduledDate:  selectedDate,
        scheduledStart: newStart,
        scheduledEnd:   newEnd,
      });
    } else {
      onScheduleTask(taskId, newStart, newEnd);
    }

    dragOffsetMinutes.current = 0;
    setDragOverTime(null);
    setDragCopyMode(false);
  }

  // --- DnD helpers for all-day strip ---
  function handleAllDayDragOver(e: React.DragEvent) {
    e.preventDefault();
    const isCopy = e.ctrlKey || e.metaKey;
    e.dataTransfer.dropEffect = isCopy ? "copy" : "move";
    setDragCopyMode(isCopy);
    setAllDayDragOver(true);
  }

  function handleAllDayDragLeave() {
    setAllDayDragOver(false);
    setDragCopyMode(false);
  }

  function handleAllDayDrop(e: React.DragEvent) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    if (e.ctrlKey || e.metaKey) {
      onCopyTaskAllDay?.(taskId, selectedDate);
    } else {
      onScheduleTaskAllDay(taskId);
    }
    dragOffsetMinutes.current = 0;
    setAllDayDragOver(false);
    setDragCopyMode(false);
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
            onClick={() => onChangeDate(localDateStr())}
            className="text-xs font-medium text-blue-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-500/10"
          >
            Today
          </button>
        )}
      </div>

      {/* All-day strip */}
      <div
        className={`shrink-0 border-b px-4 py-2 min-h-[40px] flex items-center gap-2 flex-wrap transition-colors ${
          allDayDragOver && dragCopyMode
            ? "border-green-400 bg-green-50 dark:bg-green-500/10 border-dashed"
            : allDayDragOver
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
                className={`absolute left-16 right-2 border-t-2 border-dashed z-30 pointer-events-none ${dragCopyMode ? "border-green-400" : "border-blue-400"}`}
                style={{ top: dragPreviewTop }}
              >
                <span className={`absolute -top-4 left-0 text-[10px] font-medium bg-white dark:bg-zinc-950 px-1 rounded ${dragCopyMode ? "text-green-500" : "text-blue-500"}`}>
                  {dragCopyMode ? `+ ${minutesToTime(dragOverTime!)}` : minutesToTime(dragOverTime!)}
                </span>
              </div>
            )}

            {/* Scheduled task blocks */}
            {scheduledTasks.map((task) => {
              const { col, numCols } = layout.get(task.id) ?? { col: 0, numCols: 1 };
              return (
                <ScheduleTaskBlock
                  key={task.id}
                  task={task}
                  rowHeight={rowHeight}
                  groupColor={task.groupId ? groupColorMap[task.groupId] : undefined}
                  col={col}
                  numCols={numCols}
                  onOpenDetail={setSelectedTaskId}
                  onBlockDragStart={(offset) => { dragOffsetMinutes.current = offset; }}
                />
              );
            })}
          </div>
        )}
        {selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            groups={groups}
            onClose={() => setSelectedTaskId(null)}
            onUpdate={onUpdateTask}
            onCreateGroup={onCreateGroup}
            onDeschedule={(id) => {
              const t = tasks.find((t) => t.id === id);
              if (t?.isVirtualRecurrence) {
                onCancelOccurrence?.(t.id, t.scheduledDate!);
              } else if (t?.recurringParentId) {
                onCancelOccurrence?.(t.recurringParentId, t.originalDate!);
              } else {
                onDescheduleTask(id);
              }
            }}
            onReschedule={onRescheduleTask}
            onSetRecurrence={onSetRecurrence}
            onCreateException={onCreateException}
            onUpdateAllOccurrences={onUpdateAllOccurrences}
          />
        )}
      </div>
    </div>
  );
}
