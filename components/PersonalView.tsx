"use client";

import { useState } from "react";
import { Task } from "@/types/task";
import SchedulePane from "./SchedulePane";
import BacklogPane from "./BacklogPane";

export default function PersonalView() {
  const [tasks, setTasks] = useState<Task[]>([]);

  function addTask(title: string, points?: number, description?: string) {
    const task: Task = {
      id: Date.now().toString(),
      title,
      description,
      points,
      completed: false,
    };
    setTasks((prev) => [...prev, task]);
  }

  function toggleTask(id: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }

  function scheduleTask(id: string, start: string, end: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, scheduledStart: start, scheduledEnd: end } : t
      )
    );
  }

  function updateTask(
    id: string,
    updates: Partial<Pick<Task, "title" | "description" | "points">>
  ) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
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
        <SchedulePane tasks={tasks} onUpdateTask={updateTask} />
      </div>
      <div className={`flex-1 min-h-0 flex flex-col md:flex-none md:w-[35%] ${activeTab === "backlog" ? "" : "hidden"} md:flex`}>
        <BacklogPane tasks={tasks} onAddTask={addTask} onToggleTask={toggleTask} onScheduleTask={scheduleTask} onUpdateTask={updateTask} />
      </div>
    </div>
  );
}
