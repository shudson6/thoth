"use client";

import { Task } from "@/types/task";
import { timeToMinutes } from "@/lib/time";

const MIN_BLOCK_PX = 28;

type Props = {
  task: Task;
  rowHeight: number;
  groupColor?: string;
  col?: number;
  numCols?: number;
  onOpenDetail: (id: string) => void;
  onBlockDragStart?: (offsetMinutes: number) => void;
};

export default function ScheduleTaskBlock({ task, rowHeight, groupColor, col = 0, numCols = 1, onOpenDetail, onBlockDragStart }: Props) {
  if (!task.scheduledStart || !task.scheduledEnd) return null;

  const startMin = timeToMinutes(task.scheduledStart);
  const endMin = timeToMinutes(task.scheduledEnd);
  const duration = endMin - startMin;
  const pixelsPerMinute = rowHeight / 60;

  const top = startMin * pixelsPerMinute;
  const height = Math.max(duration * pixelsPerMinute, MIN_BLOCK_PX);
  const compact = height < MIN_BLOCK_PX * 2 || numCols > 1;

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.setData("application/x-source", "schedule");
    e.dataTransfer.setData("application/x-estimate", String(duration));
    e.dataTransfer.setData("application/x-is-virtual", task.isVirtualRecurrence ? "1" : "");
    e.dataTransfer.setData("application/x-is-exception", task.recurringParentId ? "1" : "");
    e.dataTransfer.setData("application/x-original-date", task.scheduledDate ?? "");
    e.dataTransfer.setData("application/x-parent-id", task.recurringParentId ?? task.id);
    e.dataTransfer.effectAllowed = "move";
    const offsetPx = e.clientY - e.currentTarget.getBoundingClientRect().top;
    onBlockDragStart?.(offsetPx / pixelsPerMinute);
  }

  const bgColor = groupColor ?? "#3b82f6";
  const left = `calc(4rem + ${col} / ${numCols} * (100% - 4rem))`;
  const width = `calc((100% - 4rem) / ${numCols} - 4px)`;

  return (
    <div
      className="absolute rounded-md px-3 py-1 text-sm text-white shadow-sm overflow-hidden cursor-grab active:cursor-grabbing transition-opacity hover:opacity-90"
      style={{ top, height, left, width, backgroundColor: bgColor }}
      draggable
      onDragStart={handleDragStart}
      onClick={() => onOpenDetail(task.id)}
    >
      <span className="font-medium truncate block">{task.title}</span>
      {!compact && task.points != null && (
        <span className="ml-1 text-white/70 text-xs">{task.points} pts</span>
      )}
      {!compact && (task.recurrenceRule || task.recurringParentId || task.isVirtualRecurrence) && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="absolute top-1 right-1.5 w-3 h-3 opacity-60 pointer-events-none"
        >
          <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
        </svg>
      )}
    </div>
  );
}
