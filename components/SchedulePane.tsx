"use client";

import { useMemo, useState } from "react";
import { Task, Group } from "@/types/task";
import TaskDetailModal from "./TaskDetailModal";
import ScheduleContainer from "./ScheduleContainer";
import TimeRuler from "./TimeRuler";
import DayColumn from "./DayColumn";
import DueTodayStrip from "./DueTodayStrip";

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
  visibleHours: number;
  onUpdateTask: (
    id: string,
    updates: Partial<Pick<Task, "title" | "description" | "points" | "estimatedMinutes" | "groupId">>
  ) => void;
  timezone: string;
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
  onToggleTask?: (id: string) => void;
  onCreateTask?: (date: string, start: string, end: string) => void;
  onPlanForDate?: (taskId: string, date: string) => void;
  onCreateDueTodayException?: (parentId: string, originalDate: string, date: string) => void;
};

function localDateStr(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function todayStr(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return localDateStr(d);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function SchedulePane({
  tasks,
  groups,
  visibleHours,
  onUpdateTask,
  timezone,
  selectedDate,
  onChangeDate,
  onScheduleTask,
  onScheduleTaskAllDay,
  onDescheduleTask,
  onRescheduleTask,
  onCreateGroup,
  onSetRecurrence,
  onCreateException,
  onUpdateAllOccurrences,
  onCancelOccurrence,
  onCopyTask,
  onCopyTaskAllDay,
  onToggleTask,
  onCreateTask,
  onPlanForDate,
  onCreateDueTodayException,
}: Props) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [allDayDragOver, setAllDayDragOver] = useState(false);
  const [dragCopyMode, setDragCopyMode] = useState(false);

  const selectedTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId) ?? null
    : null;

  const scheduledTasks = tasks.filter(
    (t) => t.scheduledStart && t.scheduledEnd && t.scheduledDate === selectedDate
  );

  const allDayTasks = tasks.filter(
    (t) => t.scheduledDate === selectedDate && !t.scheduledStart && t.allDay === true
  );

  const dueTodayTasks = tasks.filter(
    (t) => t.scheduledDate === selectedDate && !t.scheduledStart && !t.allDay
  );

  const dayTasks = tasks.filter(
    (t) => t.scheduledDate === selectedDate && !t.cancelled && t.points != null
  );
  const totalPoints = dayTasks.reduce((sum, t) => sum + t.points!, 0);
  const completedPoints = dayTasks.filter((t) => t.completed).reduce((sum, t) => sum + t.points!, 0);

  const groupColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const g of groups) map[g.id] = g.color;
    return map;
  }, [groups]);

  const isToday = selectedDate === todayStr(timezone);

  function handleAllDayDragOver(e: React.DragEvent) {
    e.preventDefault();
    const isCopy = e.ctrlKey || e.metaKey;
    e.dataTransfer.dropEffect = isCopy ? "copy" : "move";
    setDragCopyMode(isCopy);
    setAllDayDragOver(true);
  }

  function handleAllDayDragLeave(e: React.DragEvent) {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setAllDayDragOver(false);
      setDragCopyMode(false);
    }
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
    setAllDayDragOver(false);
    setDragCopyMode(false);
  }

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
        {totalPoints > 0 && (
          <span
            className={`text-xs font-medium tabular-nums transition-colors ${
              completedPoints === totalPoints
                ? "text-green-500 dark:text-green-400"
                : "text-zinc-400 dark:text-zinc-500"
            }`}
          >
            {completedPoints} / {totalPoints} pts
          </span>
        )}
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
      <section
        aria-label="All-day events"
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
              draggable={!task.completed}
              onDragStart={task.completed ? undefined : (e) => {
                e.dataTransfer.setData("text/plain", task.id);
                e.dataTransfer.setData("application/x-source", "allday");
                e.dataTransfer.setData("application/x-estimate", String(task.estimatedMinutes ?? 60));
                e.dataTransfer.effectAllowed = "move";
              }}
              className={`rounded-full px-3 py-0.5 text-xs font-medium transition-colors hover:opacity-80 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 ${task.completed ? "opacity-50 line-through cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
              style={color ? { backgroundColor: color + "30", color } : undefined}
            >
              {task.title}
            </button>
          );
        })}
      </section>

      {/* Due-today strip — mobile only (desktop has the separate DueTodayPane column) */}
      {onPlanForDate && (
        <div className="md:hidden shrink-0 border-b border-zinc-200 dark:border-zinc-800 flex">
          <span className="w-16 shrink-0 text-xs text-zinc-400 dark:text-zinc-500 flex items-center pl-3 select-none">
            Today
          </span>
          <DueTodayStrip
            tasks={dueTodayTasks}
            date={selectedDate}
            groupColorMap={groupColorMap}
            onPlanForDate={(id) => onPlanForDate(id, selectedDate)}
            onCreateException={(parentId, originalDate) =>
              onCreateDueTodayException?.(parentId, originalDate, selectedDate)
            }
            onToggleComplete={(task) => onToggleTask?.(task.id)}
            onOpenDetail={setSelectedTaskId}
          />
        </div>
      )}

      {/* Scrollable time grid */}
      <ScheduleContainer visibleHours={visibleHours}>
        {(rowHeight) => (
          <>
            <TimeRuler rowHeight={rowHeight} />
            <DayColumn
              date={selectedDate}
              rowHeight={rowHeight}
              tasks={scheduledTasks}
              groups={groups}
              onScheduleTask={(id, start, end) => onScheduleTask(id, start, end)}
              onCopyTask={(id, start, end) => onCopyTask?.(id, selectedDate, start, end)}
              onCreateException={onCreateException}
              onOpenDetail={setSelectedTaskId}
              onCreateTask={onCreateTask}
            />
          </>
        )}
      </ScheduleContainer>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          groups={groups}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={onUpdateTask}
          onCreateGroup={onCreateGroup}
          onToggle={onToggleTask}
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
  );
}
