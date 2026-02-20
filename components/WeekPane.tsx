"use client";

import { useMemo, useState } from "react";
import { Task, Group } from "@/types/task";
import { expandForDate } from "@/lib/recurrence";
import ScheduleContainer from "./ScheduleContainer";
import TimeRuler from "./TimeRuler";
import DayColumn from "./DayColumn";
import AllDayStrip from "./AllDayStrip";
import TaskDetailModal from "./TaskDetailModal";

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
  timezone: string;
  selectedDate: string;
  onChangeDate: (date: string) => void;
  onUpdateTask: (
    id: string,
    updates: Partial<Pick<Task, "title" | "description" | "points" | "estimatedMinutes" | "groupId">>
  ) => void;
  onScheduleTask: (id: string, start: string, end: string, date?: string) => void;
  onScheduleTaskAllDay: (id: string, date?: string) => void;
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
};

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

function weekDates(anchor: string): string[] {
  const d = new Date(anchor + "T00:00:00");
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return localDateStr(day);
  });
}

function todayStr(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function shortLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
}

export default function WeekPane({
  tasks,
  groups,
  visibleHours,
  timezone,
  selectedDate,
  onChangeDate,
  onUpdateTask,
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
}: Props) {
  const [selectedDetail, setSelectedDetail] = useState<{ id: string; date: string } | null>(null);

  const dates = useMemo(() => weekDates(selectedDate), [selectedDate]);

  const expandedByDate = useMemo(
    () => Object.fromEntries(dates.map((d) => [d, expandForDate(tasks, d)])),
    [tasks, dates]
  );

  const groupColorMap: Record<string, string> = {};
  for (const g of groups) groupColorMap[g.id] = g.color;

  const selectedTask = useMemo(() => {
    if (!selectedDetail) return null;
    const expanded = expandForDate(tasks, selectedDetail.date);
    return expanded.find((t) => t.id === selectedDetail.id) ?? null;
  }, [selectedDetail, tasks]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Week header */}
      <div className="flex items-center px-2 py-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <button
          onClick={() => onChangeDate(shiftDate(selectedDate, -7))}
          className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 shrink-0"
          aria-label="Previous week"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="flex-1 grid grid-cols-7 ml-2">
          {dates.map((d) => (
            <button
              key={d}
              onClick={() => onChangeDate(d)}
              className={`text-xs font-medium text-center py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                d === selectedDate
                  ? "text-blue-500"
                  : d === todayStr(timezone)
                  ? "text-red-500"
                  : "text-zinc-600 dark:text-zinc-300"
              }`}
            >
              {shortLabel(d)}
            </button>
          ))}
        </div>
        <button
          onClick={() => onChangeDate(shiftDate(selectedDate, 7))}
          className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 shrink-0"
          aria-label="Next week"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* All-day row */}
      <div className="flex shrink-0 border-b border-zinc-200 dark:border-zinc-800">
        <div className="w-16 shrink-0 text-xs text-zinc-400 dark:text-zinc-500 flex items-center pl-3 select-none">
          All day
        </div>
        {dates.map((d) => {
          const allDayTasks = expandedByDate[d].filter(
            (t) => t.scheduledDate === d && !t.scheduledStart && !t.cancelled
          );
          return (
            <AllDayStrip
              key={d}
              tasks={allDayTasks}
              groupColorMap={groupColorMap}
              onScheduleAllDay={(taskId) => onScheduleTaskAllDay(taskId, d)}
              onCopyAllDay={(taskId) => onCopyTaskAllDay?.(taskId, d)}
              onOpenDetail={(id) => setSelectedDetail({ id, date: d })}
            />
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <ScheduleContainer visibleHours={visibleHours}>
        {(rowHeight) => (
          <>
            <TimeRuler rowHeight={rowHeight} />
            {dates.map((d) => {
              const timedTasks = expandedByDate[d].filter(
                (t) => t.scheduledDate === d && t.scheduledStart && t.scheduledEnd
              );
              return (
                <DayColumn
                  key={d}
                  date={d}
                  rowHeight={rowHeight}
                  tasks={timedTasks}
                  groups={groups}
                  onScheduleTask={(id, start, end) => onScheduleTask(id, start, end, d)}
                  onCopyTask={(id, start, end) => onCopyTask?.(id, d, start, end)}
                  onCreateException={onCreateException}
                  onOpenDetail={(id) => setSelectedDetail({ id, date: d })}
                  onCreateTask={onCreateTask}
                />
              );
            })}
          </>
        )}
      </ScheduleContainer>

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          groups={groups}
          onClose={() => setSelectedDetail(null)}
          onUpdate={onUpdateTask}
          onCreateGroup={onCreateGroup}
          onToggle={onToggleTask}
          onDeschedule={(id) => {
            const t = selectedTask;
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
