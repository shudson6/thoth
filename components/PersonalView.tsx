"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Task } from "@/types/task";
import SchedulePane from "./SchedulePane";
import BacklogPane from "./BacklogPane";
import {
  addTask as addTaskAction,
  toggleTask as toggleTaskAction,
  scheduleTask as scheduleTaskAction,
  updateTask as updateTaskAction,
} from "@/app/actions";

type Action =
  | { type: "add"; task: Task }
  | { type: "toggle"; id: string }
  | { type: "schedule"; id: string; start: string; end: string }
  | { type: "update"; id: string; updates: Partial<Pick<Task, "title" | "description" | "points">> };

function tasksReducer(tasks: Task[], action: Action): Task[] {
  switch (action.type) {
    case "add":
      return [...tasks, action.task];
    case "toggle":
      return tasks.map((t) =>
        t.id === action.id ? { ...t, completed: !t.completed } : t
      );
    case "schedule":
      return tasks.map((t) =>
        t.id === action.id
          ? { ...t, scheduledStart: action.start, scheduledEnd: action.end }
          : t
      );
    case "update":
      return tasks.map((t) =>
        t.id === action.id ? { ...t, ...action.updates } : t
      );
  }
}

export default function PersonalView({ initialTasks }: { initialTasks: Task[] }) {
  const [optimisticTasks, dispatchOptimistic] = useOptimistic(initialTasks, tasksReducer);
  const [, startTransition] = useTransition();

  function addTask(title: string, points?: number, description?: string) {
    const tempId = Math.random().toString(36).slice(2);
    const task: Task = { id: tempId, title, description, points, completed: false };
    startTransition(async () => {
      dispatchOptimistic({ type: "add", task });
      await addTaskAction(title, points, description);
    });
  }

  function toggleTask(id: string) {
    startTransition(async () => {
      dispatchOptimistic({ type: "toggle", id });
      await toggleTaskAction(id);
    });
  }

  function scheduleTask(id: string, start: string, end: string) {
    startTransition(async () => {
      dispatchOptimistic({ type: "schedule", id, start, end });
      await scheduleTaskAction(id, start, end);
    });
  }

  function updateTask(
    id: string,
    updates: Partial<Pick<Task, "title" | "description" | "points">>
  ) {
    startTransition(async () => {
      dispatchOptimistic({ type: "update", id, updates });
      await updateTaskAction(id, updates);
    });
  }

  const [activeTab, setActiveTab] = useState<"schedule" | "backlog">("schedule");

  return (
    <div className="flex flex-col md:flex-row h-screen bg-white dark:bg-zinc-950">
      {/* Mobile tab bar */}
      <div className="flex md:hidden border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab("schedule")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "schedule"
              ? "text-blue-500 border-b-2 border-blue-500"
              : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          Schedule
        </button>
        <button
          onClick={() => setActiveTab("backlog")}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "backlog"
              ? "text-blue-500 border-b-2 border-blue-500"
              : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          Backlog
        </button>
      </div>

      <div className={`flex-1 min-h-0 flex flex-col ${activeTab === "schedule" ? "" : "hidden"} md:flex`}>
        <SchedulePane tasks={optimisticTasks} onUpdateTask={updateTask} />
      </div>
      <div className={`flex-1 min-h-0 flex flex-col md:flex-none md:w-[35%] ${activeTab === "backlog" ? "" : "hidden"} md:flex`}>
        <BacklogPane tasks={optimisticTasks} onAddTask={addTask} onToggleTask={toggleTask} onScheduleTask={scheduleTask} onUpdateTask={updateTask} />
      </div>
    </div>
  );
}
