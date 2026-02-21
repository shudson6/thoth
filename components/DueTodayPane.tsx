"use client";

import { useState } from "react";
import { Task, Group } from "@/types/task";
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
  allDay?: boolean;
};

type Props = {
  tasks: Task[];
  date: string;
  groups: Group[];
  groupColorMap: Record<string, string>;
  onPlanForDate: (taskId: string) => void;
  onCopyPlanForDate?: (taskId: string) => void;
  onCreateException: (parentId: string, originalDate: string) => void;
  onToggleComplete: (task: Task) => void;
  onDeschedule: (taskId: string) => void;
  // Modal support
  onUpdateTask: (id: string, updates: Partial<Pick<Task, "title" | "description" | "points" | "estimatedMinutes" | "groupId" | "allDay">>) => void;
  onCreateGroup: (name: string, color: string) => void;
  onRescheduleTask?: (id: string, date: string, start: string | undefined, end: string | undefined) => void;
  onSetRecurrence?: (taskId: string, rule: string | null) => void;
  onCreateExceptionFull?: (parentId: string, originalDate: string, fields: ExceptionFields) => void;
  onUpdateAllOccurrences?: (masterId: string, updates: Partial<Task>) => void;
  onCancelOccurrence?: (parentId: string, originalDate: string) => void;
};

export default function DueTodayPane({
  tasks,
  date,
  groups,
  groupColorMap,
  onPlanForDate,
  onCopyPlanForDate,
  onCreateException,
  onToggleComplete,
  onDeschedule,
  onUpdateTask,
  onCreateGroup,
  onRescheduleTask,
  onSetRecurrence,
  onCreateExceptionFull,
  onUpdateAllOccurrences,
  onCancelOccurrence,
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [copyMode, setCopyMode] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const selectedTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId) ?? null
    : null;

  const incomplete = tasks.filter((t) => !t.completed && !t.cancelled);
  const completed = tasks.filter((t) => t.completed);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    const isCopy = e.ctrlKey || e.metaKey;
    e.dataTransfer.dropEffect = isCopy ? "copy" : "move";
    setCopyMode(isCopy);
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragOver(false);
      setCopyMode(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const isVirtual = e.dataTransfer.getData("application/x-is-virtual") === "1";
    const parentId = e.dataTransfer.getData("application/x-parent-id");
    const originalDate = e.dataTransfer.getData("application/x-original-date");
    const isCopy = e.ctrlKey || e.metaKey;

    if (isVirtual && parentId && originalDate) {
      onCreateException(parentId, originalDate);
    } else if (isCopy) {
      onCopyPlanForDate?.(taskId);
    } else {
      onPlanForDate(taskId);
    }

    setDragOver(false);
    setCopyMode(false);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 select-none uppercase tracking-wide">
          Due Today
        </span>
        {incomplete.length > 0 && (
          <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 tabular-nums">
            {incomplete.length}
          </span>
        )}
      </div>

      {/* Task list + drop zone */}
      <section
        aria-label="Due today tasks"
        className={`flex-1 overflow-y-auto min-h-0 transition-colors ${
          dragOver && copyMode
            ? "bg-green-50 dark:bg-green-500/5"
            : dragOver
            ? "bg-blue-50 dark:bg-blue-500/5"
            : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {tasks.length === 0 && (
          <div className={`px-3 py-4 text-xs text-center select-none ${dragOver ? "text-blue-400 dark:text-blue-500" : "text-zinc-300 dark:text-zinc-600"}`}>
            {dragOver ? "Drop to plan for today" : "Drop tasks here to plan for today"}
          </div>
        )}

        {[...incomplete, ...completed].map((task) => {
          const color = task.groupId ? groupColorMap[task.groupId] : undefined;
          const group = task.groupId ? groups.find((g) => g.id === task.groupId) : undefined;

          return (
            <div
              key={task.id}
              role="listitem"
              className={`flex items-start gap-2 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors group ${
                task.completed ? "opacity-50" : ""
              }`}
              draggable={!task.completed}
              onDragStart={task.completed ? undefined : (e) => {
                e.dataTransfer.setData("text/plain", task.id);
                e.dataTransfer.setData("application/x-source", "duetoday");
                e.dataTransfer.setData("application/x-estimate", String(task.estimatedMinutes ?? 60));
                if (task.isVirtualRecurrence) {
                  e.dataTransfer.setData("application/x-is-virtual", "1");
                  e.dataTransfer.setData("application/x-parent-id", task.id);
                  e.dataTransfer.setData("application/x-original-date", task.scheduledDate!);
                }
                e.dataTransfer.effectAllowed = "move";
              }}
            >
              {/* Checkbox */}
              <button
                onClick={() => onToggleComplete(task)}
                className={`mt-0.5 w-3.5 h-3.5 shrink-0 rounded border flex items-center justify-center transition-colors ${
                  task.completed
                    ? "bg-zinc-400 dark:bg-zinc-500 border-zinc-400 dark:border-zinc-500"
                    : "border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500"
                }`}
                aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
              >
                {task.completed && (
                  <svg viewBox="0 0 10 10" className="w-2 h-2 text-white fill-current">
                    <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              {/* Task info */}
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`text-xs text-left w-full text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors ${task.completed ? "line-through" : ""}`}
                  style={color ? { color } : undefined}
                >
                  {task.title}
                </button>
                {(group || task.points != null) && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {group && (
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm text-white leading-none"
                        style={{ backgroundColor: group.color }}
                      >
                        {group.name}
                      </span>
                    )}
                    {task.points != null && (
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                        {task.points} pts
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Remove to backlog */}
              <button
                onClick={() => onDeschedule(task.id)}
                className="opacity-0 group-hover:opacity-100 shrink-0 text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 transition-all"
                title="Move to backlog"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          );
        })}
      </section>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          groups={groups}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={onUpdateTask}
          onCreateGroup={onCreateGroup}
          onToggle={(id) => { onToggleComplete(tasks.find((t) => t.id === id)!); }}
          onDeschedule={(id) => {
            const t = tasks.find((t) => t.id === id);
            if (t?.isVirtualRecurrence) {
              onCancelOccurrence?.(t.id, t.scheduledDate!);
            } else if (t?.recurringParentId) {
              onCancelOccurrence?.(t.recurringParentId, t.originalDate!);
            } else {
              onDeschedule(id);
            }
            setSelectedTaskId(null);
          }}
          onReschedule={onRescheduleTask}
          onSetRecurrence={onSetRecurrence}
          onCreateException={onCreateExceptionFull}
          onUpdateAllOccurrences={onUpdateAllOccurrences}
        />
      )}
    </div>
  );
}
