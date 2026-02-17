"use client";

import { Task } from "@/types/task";
import { timeToMinutes } from "@/lib/time";

type Props = {
  task: Task;
  rowHeight: number;
  onOpenDetail: (id: string) => void;
};

export default function ScheduleTaskBlock({ task, rowHeight, onOpenDetail }: Props) {
  if (!task.scheduledStart || !task.scheduledEnd) return null;

  const startMin = timeToMinutes(task.scheduledStart);
  const endMin = timeToMinutes(task.scheduledEnd);
  const duration = endMin - startMin;
  const pixelsPerMinute = rowHeight / 60;

  const top = startMin * pixelsPerMinute;
  const height = Math.max(duration * pixelsPerMinute, pixelsPerMinute * 15);

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.setData("application/x-source", "schedule");
    e.dataTransfer.setData("application/x-estimate", String(duration));
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div
      className="absolute left-16 right-2 rounded-md bg-blue-500 px-3 py-1 text-sm text-white shadow-sm overflow-hidden cursor-grab active:cursor-grabbing hover:bg-blue-600 transition-colors"
      style={{ top, height }}
      draggable
      onDragStart={handleDragStart}
      onClick={() => onOpenDetail(task.id)}
    >
      <span className="font-medium">{task.title}</span>
      {task.points != null && (
        <span className="ml-2 text-blue-200 text-xs">{task.points} pts</span>
      )}
    </div>
  );
}
