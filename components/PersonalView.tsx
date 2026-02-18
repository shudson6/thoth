"use client";

import { useOptimistic, useMemo, useState, useTransition } from "react";
import { Task, Group } from "@/types/task";
import SchedulePane from "./SchedulePane";
import BacklogPane from "./BacklogPane";
import { expandForDate } from "@/lib/recurrence";
import {
  addTask as addTaskAction,
  toggleTask as toggleTaskAction,
  scheduleTask as scheduleTaskAction,
  descheduleTask as descheduleTaskAction,
  scheduleTaskAllDay as scheduleTaskAllDayAction,
  updateTask as updateTaskAction,
  createGroup as createGroupAction,
  updateGroup as updateGroupAction,
  deleteGroup as deleteGroupAction,
  setRecurrence as setRecurrenceAction,
  removeRecurrence as removeRecurrenceAction,
  createException as createExceptionAction,
  updateAllOccurrences as updateAllOccurrencesAction,
} from "@/app/actions";

type TaskAction =
  | { type: "add"; task: Task }
  | { type: "toggle"; id: string }
  | { type: "schedule"; id: string; start: string; end: string; date: string }
  | { type: "scheduleAllDay"; id: string; date: string }
  | { type: "deschedule"; id: string }
  | { type: "update"; id: string; updates: Partial<Pick<Task, "title" | "description" | "points" | "estimatedMinutes" | "groupId">> }
  | { type: "deleteGroupTasks"; groupId: string }
  | { type: "setRecurrence"; id: string; rule: string }
  | { type: "removeRecurrence"; id: string }
  | { type: "addException"; exception: Task }
  | { type: "updateMaster"; id: string; updates: Partial<Task> }
  | { type: "cancelOccurrence"; parentId: string; originalDate: string };

function tasksReducer(tasks: Task[], action: TaskAction): Task[] {
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
          ? { ...t, scheduledDate: action.date, scheduledStart: action.start, scheduledEnd: action.end }
          : t
      );
    case "scheduleAllDay":
      return tasks.map((t) =>
        t.id === action.id
          ? { ...t, scheduledDate: action.date, scheduledStart: undefined, scheduledEnd: undefined }
          : t
      );
    case "deschedule":
      return tasks.map((t) =>
        t.id === action.id
          ? { ...t, scheduledDate: undefined, scheduledStart: undefined, scheduledEnd: undefined }
          : t
      );
    case "update":
      return tasks.map((t) =>
        t.id === action.id ? { ...t, ...action.updates } : t
      );
    case "deleteGroupTasks":
      return tasks.filter((t) => t.groupId !== action.groupId);
    case "setRecurrence":
      return tasks.map((t) =>
        t.id === action.id ? { ...t, recurrenceRule: action.rule } : t
      );
    case "removeRecurrence":
      return tasks
        .filter((t) => t.recurringParentId !== action.id)
        .map((t) => t.id === action.id ? { ...t, recurrenceRule: undefined } : t);
    case "addException":
      return [
        ...tasks.filter((t) =>
          !(t.recurringParentId === action.exception.recurringParentId &&
            t.originalDate === action.exception.originalDate)
        ),
        action.exception,
      ];
    case "updateMaster":
      return tasks.map((t) =>
        t.id === action.id ? { ...t, ...action.updates } : t
      );
    case "cancelOccurrence":
      return [
        ...tasks.filter((t) =>
          !(t.recurringParentId === action.parentId && t.originalDate === action.originalDate)
        ),
        {
          id: `cancelled-${action.parentId}-${action.originalDate}`,
          title: "",
          completed: false,
          cancelled: true,
          recurringParentId: action.parentId,
          originalDate: action.originalDate,
        } as Task,
      ];
  }
}

type GroupAction =
  | { type: "add"; group: Group }
  | { type: "update"; id: string; updates: Partial<Pick<Group, "name" | "color">> }
  | { type: "delete"; id: string };

function groupsReducer(groups: Group[], action: GroupAction): Group[] {
  switch (action.type) {
    case "add":
      return [...groups, action.group];
    case "update":
      return groups.map((g) =>
        g.id === action.id ? { ...g, ...action.updates } : g
      );
    case "delete":
      return groups.filter((g) => g.id !== action.id);
  }
}

type Props = {
  initialTasks: Task[];
  initialGroups: Group[];
};

export default function PersonalView({ initialTasks, initialGroups }: Props) {
  const [optimisticTasks, dispatchTasks] = useOptimistic(initialTasks, tasksReducer);
  const [optimisticGroups, dispatchGroups] = useOptimistic(initialGroups, groupsReducer);
  const [, startTransition] = useTransition();

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  const expandedTasks = useMemo(
    () => expandForDate(optimisticTasks, selectedDate),
    [optimisticTasks, selectedDate]
  );

  function addTask(title: string, points?: number, description?: string, estimatedMinutes?: number, groupId?: string) {
    const tempId = Math.random().toString(36).slice(2);
    const task: Task = { id: tempId, title, description, points, estimatedMinutes, groupId, completed: false };
    startTransition(async () => {
      dispatchTasks({ type: "add", task });
      await addTaskAction(title, points, description, estimatedMinutes, groupId);
    });
  }

  function toggleTask(id: string) {
    // Check if this is a virtual recurring instance
    const task = expandedTasks.find((t) => t.id === id);
    if (task?.isVirtualRecurrence) {
      handleCreateException(id, task.scheduledDate!, { completed: !task.completed });
      return;
    }
    startTransition(async () => {
      dispatchTasks({ type: "toggle", id });
      await toggleTaskAction(id);
    });
  }

  function scheduleTask(id: string, start: string, end: string, date?: string) {
    const d = date ?? selectedDate;
    startTransition(async () => {
      dispatchTasks({ type: "schedule", id, start, end, date: d });
      await scheduleTaskAction(id, start, end, d);
    });
  }

  function descheduleTask(id: string) {
    startTransition(async () => {
      dispatchTasks({ type: "deschedule", id });
      await descheduleTaskAction(id);
    });
  }

  function scheduleTaskAllDay(id: string, date?: string) {
    const d = date ?? selectedDate;
    startTransition(async () => {
      dispatchTasks({ type: "scheduleAllDay", id, date: d });
      await scheduleTaskAllDayAction(id, d);
    });
  }

  function rescheduleTask(id: string, date: string, start: string | undefined, end: string | undefined) {
    if (start && end) {
      startTransition(async () => {
        dispatchTasks({ type: "schedule", id, start, end, date });
        await scheduleTaskAction(id, start, end, date);
      });
    } else {
      startTransition(async () => {
        dispatchTasks({ type: "scheduleAllDay", id, date });
        await scheduleTaskAllDayAction(id, date);
      });
    }
  }

  function updateTask(
    id: string,
    updates: Partial<Pick<Task, "title" | "description" | "points" | "estimatedMinutes" | "groupId">>
  ) {
    startTransition(async () => {
      dispatchTasks({ type: "update", id, updates });
      await updateTaskAction(id, updates);
    });
  }

  // --- Recurrence callbacks ---

  function handleSetRecurrence(taskId: string, rule: string | null) {
    if (rule) {
      startTransition(async () => {
        dispatchTasks({ type: "setRecurrence", id: taskId, rule });
        await setRecurrenceAction(taskId, rule);
      });
    } else {
      startTransition(async () => {
        dispatchTasks({ type: "removeRecurrence", id: taskId });
        await removeRecurrenceAction(taskId);
      });
    }
  }

  function handleCreateException(
    parentId: string,
    originalDate: string,
    fields: Parameters<typeof createExceptionAction>[2]
  ) {
    const tempId = Math.random().toString(36).slice(2);
    const master = optimisticTasks.find((t) => t.id === parentId);
    if (!master) return;
    const exception: Task = {
      ...master,
      id: tempId,
      recurringParentId: parentId,
      originalDate,
      recurrenceRule: undefined,
      isVirtualRecurrence: undefined,
      title: fields.title ?? master.title,
      description: (fields.description ?? master.description) ?? undefined,
      points: (fields.points ?? master.points) ?? undefined,
      estimatedMinutes: (fields.estimatedMinutes ?? master.estimatedMinutes) ?? undefined,
      groupId: (fields.groupId ?? master.groupId) ?? undefined,
      scheduledDate: fields.scheduledDate ?? master.scheduledDate,
      scheduledStart: "scheduledStart" in fields ? (fields.scheduledStart ?? undefined) : master.scheduledStart,
      scheduledEnd: "scheduledEnd" in fields ? (fields.scheduledEnd ?? undefined) : master.scheduledEnd,
      completed: fields.completed ?? master.completed,
      cancelled: fields.cancelled ?? undefined,
    };
    startTransition(async () => {
      dispatchTasks({ type: "addException", exception });
      await createExceptionAction(parentId, originalDate, fields);
    });
  }

  function handleUpdateAllOccurrences(
    masterId: string,
    updates: Parameters<typeof updateAllOccurrencesAction>[1]
  ) {
    // Coerce nullable fields to undefined for the optimistic Task type
    const taskUpdates: Partial<Task> = {
      ...(updates.title              !== undefined && { title:            updates.title }),
      ...(updates.description        !== undefined && { description:      updates.description ?? undefined }),
      ...(updates.points             !== undefined && { points:           updates.points ?? undefined }),
      ...(updates.estimatedMinutes   !== undefined && { estimatedMinutes: updates.estimatedMinutes ?? undefined }),
      ...(updates.groupId            !== undefined && { groupId:          updates.groupId ?? undefined }),
      ...(updates.scheduledStart     !== undefined && { scheduledStart:   updates.scheduledStart ?? undefined }),
      ...(updates.scheduledEnd       !== undefined && { scheduledEnd:     updates.scheduledEnd ?? undefined }),
      ...(updates.recurrenceRule     !== undefined && { recurrenceRule:   updates.recurrenceRule }),
    };
    startTransition(async () => {
      dispatchTasks({ type: "updateMaster", id: masterId, updates: taskUpdates });
      await updateAllOccurrencesAction(masterId, updates);
    });
  }

  function handleCancelOccurrence(parentId: string, originalDate: string) {
    startTransition(async () => {
      dispatchTasks({ type: "cancelOccurrence", parentId, originalDate });
      await createExceptionAction(parentId, originalDate, { cancelled: true });
    });
  }

  // --- Group callbacks ---

  function handleCreateGroup(name: string, color: string) {
    const tempId = Math.random().toString(36).slice(2);
    startTransition(async () => {
      dispatchGroups({ type: "add", group: { id: tempId, name, color } });
      await createGroupAction(name, color);
    });
  }

  function handleUpdateGroup(id: string, updates: Partial<Pick<Group, "name" | "color">>) {
    startTransition(async () => {
      dispatchGroups({ type: "update", id, updates });
      await updateGroupAction(id, updates);
    });
  }

  function handleDeleteGroup(id: string, deleteTasks: boolean) {
    startTransition(async () => {
      dispatchGroups({ type: "delete", id });
      if (deleteTasks) {
        dispatchTasks({ type: "deleteGroupTasks", groupId: id });
      }
      await deleteGroupAction(id, deleteTasks);
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
        <SchedulePane
          tasks={expandedTasks}
          groups={optimisticGroups}
          onUpdateTask={updateTask}
          selectedDate={selectedDate}
          onChangeDate={setSelectedDate}
          onScheduleTask={scheduleTask}
          onScheduleTaskAllDay={scheduleTaskAllDay}
          onDescheduleTask={descheduleTask}
          onRescheduleTask={rescheduleTask}
          onCreateGroup={handleCreateGroup}
          onSetRecurrence={handleSetRecurrence}
          onCreateException={handleCreateException}
          onUpdateAllOccurrences={handleUpdateAllOccurrences}
          onCancelOccurrence={handleCancelOccurrence}
        />
      </div>
      <div className={`flex-1 min-h-0 flex flex-col md:flex-none md:w-[35%] ${activeTab === "backlog" ? "" : "hidden"} md:flex`}>
        <BacklogPane
          tasks={optimisticTasks}
          groups={optimisticGroups}
          onAddTask={addTask}
          onToggleTask={toggleTask}
          onScheduleTask={scheduleTask}
          onScheduleTaskAllDay={scheduleTaskAllDay}
          onDescheduleTask={descheduleTask}
          onUpdateTask={updateTask}
          onCreateGroup={handleCreateGroup}
          onUpdateGroup={handleUpdateGroup}
          onDeleteGroup={handleDeleteGroup}
        />
      </div>
    </div>
  );
}
