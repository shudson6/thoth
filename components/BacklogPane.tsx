"use client";

import { useState } from "react";
import { Task } from "@/types/task";
import BacklogTaskItem from "./BacklogTaskItem";
import AddTaskForm from "./AddTaskForm";

type Props = {
  tasks: Task[];
  onAddTask: (title: string, points?: number, description?: string) => void;
  onToggleTask: (id: string) => void;
  onScheduleTask: (id: string, start: string, end: string) => void;
};

export default function BacklogPane({ tasks, onAddTask, onToggleTask, onScheduleTask }: Props) {
  const [showForm, setShowForm] = useState(false);

  const backlogTasks = tasks.filter((t) => !t.scheduledStart);
  const incomplete = backlogTasks.filter((t) => !t.completed);
  const completed = backlogTasks.filter((t) => t.completed);

  return (
    <div className="w-[35%] border-l border-zinc-200 dark:border-zinc-800 flex flex-col h-full">
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
          onAdd={(title, points, description) => {
            onAddTask(title, points, description);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {incomplete.length === 0 && completed.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-zinc-400">
            No tasks yet. Add one to get started.
          </p>
        )}

        {incomplete.map((task) => (
          <BacklogTaskItem key={task.id} task={task} onToggle={onToggleTask} onSchedule={onScheduleTask} />
        ))}

        {completed.length > 0 && (
          <div className="mt-2">
            <div className="px-4 py-1.5 text-xs text-zinc-400 dark:text-zinc-500 font-medium">
              Completed ({completed.length})
            </div>
            {completed.map((task) => (
              <BacklogTaskItem key={task.id} task={task} onToggle={onToggleTask} onSchedule={onScheduleTask} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
