"use client";

import { useState } from "react";
import { Task } from "@/types/task";
import BacklogTaskItem from "./BacklogTaskItem";
import AddTaskForm from "./AddTaskForm";
import TaskDetailModal from "./TaskDetailModal";

type Props = {
  tasks: Task[];
  onAddTask: (title: string, points?: number, description?: string, estimatedMinutes?: number) => void;
  onToggleTask: (id: string) => void;
  onScheduleTask: (id: string, start: string, end: string) => void;
  onScheduleTaskAllDay: (id: string) => void;
  onDescheduleTask: (id: string) => void;
  onUpdateTask: (
    id: string,
    updates: Partial<Pick<Task, "title" | "description" | "points" | "estimatedMinutes">>
  ) => void;
};

export default function BacklogPane({ tasks, onAddTask, onToggleTask, onScheduleTask, onScheduleTaskAllDay, onDescheduleTask, onUpdateTask }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const selectedTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId) ?? null
    : null;

  const backlogTasks = tasks.filter((t) => !t.scheduledDate);
  const incomplete = backlogTasks.filter((t) => !t.completed);
  const completed = backlogTasks.filter((t) => t.completed);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    onDescheduleTask(taskId);
    setDragOver(false);
  }

  return (
    <div className="md:border-l border-zinc-200 dark:border-zinc-800 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Backlog
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 rounded-md bg-blue-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
        >
          + Add Task
        </button>
      </div>

      {/* Add task form */}
      {showForm && (
        <AddTaskForm
          onAdd={(title, points, description, estimatedMinutes) => {
            onAddTask(title, points, description, estimatedMinutes);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Task list (drop target for descheduling) */}
      <div
        className={`flex-1 overflow-y-auto transition-colors ${
          dragOver ? "bg-blue-50 dark:bg-blue-500/10 outline-2 outline-dashed outline-blue-400 -outline-offset-2" : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {incomplete.length === 0 && completed.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-zinc-400">
            No tasks yet. Add one to get started.
          </p>
        )}

        {incomplete.map((task) => (
          <BacklogTaskItem key={task.id} task={task} onToggle={onToggleTask} onSchedule={onScheduleTask} onOpenDetail={setSelectedTaskId} />
        ))}

        {completed.length > 0 && (
          <div className="mt-2">
            <div className="px-4 py-1.5 text-xs text-zinc-400 dark:text-zinc-500 font-medium">
              Completed ({completed.length})
            </div>
            {completed.map((task) => (
              <BacklogTaskItem key={task.id} task={task} onToggle={onToggleTask} onSchedule={onScheduleTask} onOpenDetail={setSelectedTaskId} />
            ))}
          </div>
        )}
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={onUpdateTask}
        />
      )}
    </div>
  );
}
