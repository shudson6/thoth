"use client";

import { useEffect, useRef, useState } from "react";
import { Task } from "@/types/task";
import ScheduleTaskBlock from "./ScheduleTaskBlock";

type Props = {
  tasks: Task[];
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const VISIBLE_HOURS = 16;

function formatHour(h: number): string {
  const suffix = h >= 12 ? "PM" : "AM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display} ${suffix}`;
}

export default function SchedulePane({ tasks }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rowHeight, setRowHeight] = useState(0);

  useEffect(() => {
    function updateRowHeight() {
      if (containerRef.current) {
        setRowHeight(containerRef.current.clientHeight / VISIBLE_HOURS);
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
    (t) => t.scheduledStart && t.scheduledEnd && !t.completed
  );

  // Current time indicator
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [timeOffset, setTimeOffset] = useState(currentMinutes);

  useEffect(() => {
    const interval = setInterval(() => {
      const n = new Date();
      setTimeOffset(n.getHours() * 60 + n.getMinutes());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const totalHeight = rowHeight * 24;
  const timeIndicatorTop = rowHeight > 0 ? (timeOffset / 60) * rowHeight : 0;

  return (
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
          <div
            className="absolute left-14 right-0 border-t-2 border-red-500 z-20 pointer-events-none"
            style={{ top: timeIndicatorTop }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 -mt-[6px] -ml-[5px]" />
          </div>

          {/* Scheduled task blocks */}
          {scheduledTasks.map((task) => (
            <ScheduleTaskBlock key={task.id} task={task} rowHeight={rowHeight} />
          ))}
        </div>
      )}
    </div>
  );
}
