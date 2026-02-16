"use client";

import { Task } from "@/types/task";

type Props = {
  task: Task;
  rowHeight: number;
  onOpenDetail: (id: string) => void;
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export default function ScheduleTaskBlock({ task, rowHeight, onOpenDetail }: Props) {
  if (!task.scheduledStart || !task.scheduledEnd) return null;

  const startMin = timeToMinutes(task.scheduledStart);
  const endMin = timeToMinutes(task.scheduledEnd);
  const pixelsPerMinute = rowHeight / 60;

  const top = startMin * pixelsPerMinute;
  const height = Math.max((endMin - startMin) * pixelsPerMinute, pixelsPerMinute * 15);

  return (
    <div
      className="absolute left-16 right-2 rounded-md bg-blue-500 px-3 py-1 text-sm text-white shadow-sm overflow-hidden cursor-pointer hover:bg-blue-600 transition-colors"
      style={{ top, height }}
      onClick={() => onOpenDetail(task.id)}
    >
      <span className="font-medium">{task.title}</span>
      {task.points != null && (
        <span className="ml-2 text-blue-200 text-xs">{task.points} pts</span>
      )}
    </div>
  );
}
