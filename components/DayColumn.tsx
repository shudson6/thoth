"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Task, Group } from "@/types/task";
import ScheduleTaskBlock from "./ScheduleTaskBlock";
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
  date: string;
  rowHeight: number;
  onScheduleTask: (id: string, start: string, end: string) => void;
  onCopyTask: (id: string, start: string, end: string) => void;
  onCreateException?: (parentId: string, origDate: string, fields: ExceptionFields) => void;
  onOpenDetail: (id: string) => void;
  onCreateTask?: (date: string, start: string, end: string) => void;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SNAP_MINUTES = 15;
const MIN_BLOCK_PX = 28;

function localDateStr(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

  const colEnds: number[] = [];
  const taskCols = new Map<string, number>();
  for (const task of sorted) {
    const start = timeToMinutes(task.scheduledStart!);
    const end = timeToMinutes(task.scheduledEnd!);
    const effectiveEnd = Math.max(end, start + minBlockMinutes);
    let col = colEnds.findIndex((e) => e <= start);
    if (col === -1) col = colEnds.length;
    colEnds[col] = effectiveEnd;
    taskCols.set(task.id, col);
  }

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
    const start = timeToMinutes(sorted[i].scheduledStart!);
    const end = timeToMinutes(sorted[i].scheduledEnd!);
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

export default function DayColumn({
  tasks,
  groups,
  date,
  rowHeight,
  onScheduleTask,
  onCopyTask,
  onCreateException,
  onOpenDetail,
  onCreateTask,
}: Props) {
  const columnRef = useRef<HTMLDivElement>(null);
  const dragOffsetMinutes = useRef(0);
  const [dragOverTime, setDragOverTime] = useState<number | null>(null);
  const [dragCopyMode, setDragCopyMode] = useState(false);

  const isToday = date === localDateStr();
  const [timeOffset, setTimeOffset] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });

  useEffect(() => {
    if (!isToday) return;
    const interval = setInterval(() => {
      const n = new Date();
      setTimeOffset(n.getHours() * 60 + n.getMinutes());
    }, 60_000);
    return () => clearInterval(interval);
  }, [isToday]);

  const layout = useMemo(() => computeLayout(tasks, rowHeight), [tasks, rowHeight]);

  const groupColorMap: Record<string, string> = {};
  for (const g of groups) groupColorMap[g.id] = g.color;

  const totalHeight = rowHeight * 24;
  const timeIndicatorTop = rowHeight > 0 ? (timeOffset / 60) * rowHeight : 0;

  function getMinutesFromY(clientY: number, applyDragOffset = false): number {
    if (!columnRef.current || rowHeight <= 0) return 0;
    const rect = columnRef.current.getBoundingClientRect();
    // getBoundingClientRect().top already accounts for scroll position
    const relY = clientY - rect.top;
    const minutes = (relY / totalHeight) * 24 * 60 - (applyDragOffset ? dragOffsetMinutes.current : 0);
    return snapToGrid(Math.max(0, Math.min(minutes, 24 * 60 - SNAP_MINUTES)));
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    const isCopy = e.ctrlKey || e.metaKey;
    e.dataTransfer.dropEffect = isCopy ? "copy" : "move";
    setDragCopyMode(isCopy);
    setDragOverTime(getMinutesFromY(e.clientY, true));
  }

  function handleDragLeave(e: React.DragEvent) {
    if (columnRef.current && !columnRef.current.contains(e.relatedTarget as Node)) {
      setDragOverTime(null);
      setDragCopyMode(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const isCopy = e.ctrlKey || e.metaKey;
    const estimateStr = e.dataTransfer.getData("application/x-estimate");
    const estimate = estimateStr ? Number(estimateStr) : 60;
    const isVirtual = e.dataTransfer.getData("application/x-is-virtual") === "1";
    const isException = e.dataTransfer.getData("application/x-is-exception") === "1";
    const origDate = e.dataTransfer.getData("application/x-original-date");
    const parentId = e.dataTransfer.getData("application/x-parent-id");

    const startMin = getMinutesFromY(e.clientY, true);
    const endMin = Math.min(startMin + estimate, 24 * 60);
    const newStart = minutesToTime(startMin);
    const newEnd = minutesToTime(endMin);

    if (isCopy) {
      onCopyTask(taskId, newStart, newEnd);
    } else if ((isVirtual || isException) && onCreateException && origDate && parentId) {
      onCreateException(parentId, origDate, {
        scheduledDate: date,
        scheduledStart: newStart,
        scheduledEnd: newEnd,
      });
    } else {
      onScheduleTask(taskId, newStart, newEnd);
    }

    dragOffsetMinutes.current = 0;
    setDragOverTime(null);
    setDragCopyMode(false);
  }

  const dragPreviewTop = dragOverTime !== null && rowHeight > 0
    ? (dragOverTime / 60) * rowHeight
    : null;

  // --- Click / long-press to create ---
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressClientY = useRef(0);

  const handleColumnClick = useCallback((e: React.MouseEvent) => {
    if (!onCreateTask) return;
    const startMin = getMinutesFromY(e.clientY);
    const endMin = Math.min(startMin + 60, 24 * 60);
    onCreateTask(date, minutesToTime(startMin), minutesToTime(endMin));
  }, [onCreateTask, date, rowHeight]); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse") return;
    if ((e.target as HTMLElement).closest("[data-task-block]")) return;
    longPressClientY.current = e.clientY;
    longPressTimer.current = setTimeout(() => {
      if (!onCreateTask) return;
      const startMin = getMinutesFromY(longPressClientY.current);
      const endMin = Math.min(startMin + 60, 24 * 60);
      onCreateTask(date, minutesToTime(startMin), minutesToTime(endMin));
    }, 500);
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (longPressTimer.current === null) return;
    const dy = e.clientY - longPressClientY.current;
    if (Math.abs(dy) > 10) cancelLongPress();
  }

  return (
    <div
      ref={columnRef}
      className="flex-1 relative border-l border-zinc-200 dark:border-zinc-800"
      style={{ height: totalHeight }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={onCreateTask ? handleColumnClick : undefined}
      onPointerDown={onCreateTask ? handlePointerDown : undefined}
      onPointerUp={onCreateTask ? cancelLongPress : undefined}
      onPointerCancel={onCreateTask ? cancelLongPress : undefined}
      onPointerMove={onCreateTask ? handlePointerMove : undefined}
    >
      {/* Hour grid lines */}
      {HOURS.map((h) => (
        <div
          key={h}
          className="absolute left-0 right-0 border-b border-zinc-200 dark:border-zinc-800"
          style={{ top: h * rowHeight, height: rowHeight }}
        />
      ))}

      {/* Current time indicator */}
      {isToday && (
        <div
          className="absolute left-0 right-0 border-t-2 border-red-500 z-20 pointer-events-none"
          style={{ top: timeIndicatorTop }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 -mt-[6px] -ml-[5px]" />
        </div>
      )}

      {/* Drop preview */}
      {dragPreviewTop !== null && (
        <div
          className={`absolute left-0 right-2 border-t-2 border-dashed z-30 pointer-events-none ${dragCopyMode ? "border-green-400" : "border-blue-400"}`}
          style={{ top: dragPreviewTop }}
        >
          <span className={`absolute -top-4 left-0 text-[10px] font-medium bg-white dark:bg-zinc-950 px-1 rounded ${dragCopyMode ? "text-green-500" : "text-blue-500"}`}>
            {dragCopyMode ? `+ ${minutesToTime(dragOverTime!)}` : minutesToTime(dragOverTime!)}
          </span>
        </div>
      )}

      {/* Scheduled task blocks */}
      {tasks.map((task) => {
        const { col, numCols } = layout.get(task.id) ?? { col: 0, numCols: 1 };
        return (
          <ScheduleTaskBlock
            key={task.id}
            task={task}
            rowHeight={rowHeight}
            groupColor={task.groupId ? groupColorMap[task.groupId] : undefined}
            col={col}
            numCols={numCols}
            onOpenDetail={onOpenDetail}
            onBlockDragStart={(offset) => { dragOffsetMinutes.current = offset; }}
          />
        );
      })}
    </div>
  );
}
