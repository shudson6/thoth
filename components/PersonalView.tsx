"use client";

import { useState } from "react";
import { Task } from "@/types/task";
import SchedulePane from "./SchedulePane";
import BacklogPane from "./BacklogPane";

export default function PersonalView() {
  const [tasks, setTasks] = useState<Task[]>([]);

  function addTask(title: string, points?: number) {
    const task: Task = {
      id: Date.now().toString(),
      title,
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

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950">
      <SchedulePane tasks={tasks} />
      <BacklogPane tasks={tasks} onAddTask={addTask} onToggleTask={toggleTask} onScheduleTask={scheduleTask} />
    </div>
  );
}
