"use client";

import { useOptimistic, useMemo, useState, useTransition, useEffect } from "react";
import { Task, Group } from "@/types/task";
import SchedulePane from "./SchedulePane";
import WeekPane from "./WeekPane";
import BacklogPane from "./BacklogPane";
import DueTodayPane from "./DueTodayPane";
import QuickCreateModal from "./QuickCreateModal";
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
  copyAndScheduleTask as copyAndScheduleTaskAction,
  addAndScheduleTask as addAndScheduleTaskAction,
  planTaskForDate as planTaskForDateAction,
} from "@/app/actions";

type TaskAction =
  | { type: "add"; task: Task }
  | { type: "toggle"; id: string }
  | { type: "schedule"; id: string; start: string; end: string; date: string }
  | { type: "scheduleAllDay"; id: string; date: string }
  | { type: "planForDate"; id: string; date: string }
  | { type: "deschedule"; id: string }
  | { type: "update"; id: string; updates: Partial<Pick<Task, "title" | "description" | "points" | "estimatedMinutes" | "groupId">> }
  | { type: "deleteGroupTasks"; groupId: string }
  | { type: "setRecurrence"; id: string; rule: string }
  | { type: "promoteToException"; taskId: string; rule: string; tempMasterId: string }
  | { type: "removeRecurrence"; id: string }
  | { type: "addException"; exception: Task }
  | { type: "updateMaster"; id: string; updates: Partial<Task> }
  | { type: "cancelOccurrence"; parentId: string; originalDate: string }
  | { type: "copy"; task: Task };

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
          ? { ...t, scheduledDate: action.date, scheduledStart: action.start, scheduledEnd: action.end, allDay: false }
          : t
      );
    case "scheduleAllDay":
      return tasks.map((t) =>
        t.id === action.id
          ? { ...t, scheduledDate: action.date, scheduledStart: undefined, scheduledEnd: undefined, allDay: true }
          : t
      );
    case "planForDate":
      return tasks.map((t) =>
        t.id === action.id
          ? { ...t, scheduledDate: action.date, scheduledStart: undefined, scheduledEnd: undefined, allDay: false }
          : t
      );
    case "deschedule":
      return tasks.map((t) =>
        t.id === action.id
          ? { ...t, scheduledDate: undefined, scheduledStart: undefined, scheduledEnd: undefined, allDay: false }
          : t
      );
    case "update":
    case "updateMaster":
      return tasks.map((t) =>
        t.id === action.id ? { ...t, ...action.updates } : t
      );
    case "deleteGroupTasks":
      return tasks.filter((t) => t.groupId !== action.groupId);
    case "setRecurrence":
      return tasks.map((t) =>
        t.id === action.id ? { ...t, recurrenceRule: action.rule } : t
      );
    case "promoteToException": {
      const original = tasks.find((t) => t.id === action.taskId);
      if (!original) return tasks;
      const newMaster: Task = {
        ...original,
        id: action.tempMasterId,
        recurrenceRule: action.rule,
        completed: false,
        recurringParentId: undefined,
        originalDate: undefined,
        isVirtualRecurrence: undefined,
      };
      return [
        ...tasks.filter((t) => t.id !== action.taskId),
        newMaster,
        {
          ...original,
          recurringParentId: action.tempMasterId,
          originalDate: original.scheduledDate,
          recurrenceRule: undefined,
        },
      ];
    }
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
    case "copy":
      return [...tasks, action.task];
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

type Props = Readonly<{
  initialTasks: Task[];
  initialGroups: Group[];
  initialDate: string;
  initialTimezone: string;
}>;

export default function PersonalView({ initialTasks, initialGroups, initialDate, initialTimezone }: Props) {
  const [optimisticTasks, dispatchTasks] = useOptimistic(initialTasks, tasksReducer);
  const [optimisticGroups, dispatchGroups] = useOptimistic(initialGroups, groupsReducer);
  const [, startTransition] = useTransition();

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [timezone, setTimezone] = useState(initialTimezone);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const todayLocal = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; SameSite=Lax`;
    setTimezone(tz); // eslint-disable-line react-hooks/set-state-in-effect
    // Correct the date only if it still holds the server's initial value
    // (i.e. the user hasn't navigated away yet) and the local date differs
    setSelectedDate((prev) =>
      prev === initialDate && todayLocal !== prev ? todayLocal : prev
    );
  }, [initialDate]);

  const expandedTasks = useMemo(
    () => expandForDate(optimisticTasks, selectedDate),
    [optimisticTasks, selectedDate]
  );

  const dueTodayTasks = useMemo(
    () => expandedTasks.filter(
      (t) => t.scheduledDate === selectedDate && !t.scheduledStart && !t.allDay && !t.cancelled
    ),
    [expandedTasks, selectedDate]
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
    if (task?.isVirtualRecurrence && task.scheduledDate) {
      handleCreateException(id, task.scheduledDate, { completed: !task.completed });
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
    updates: Partial<Pick<Task, "title" | "description" | "points" | "estimatedMinutes" | "groupId" | "allDay">>
  ) {
    startTransition(async () => {
      dispatchTasks({ type: "update", id, updates });
      await updateTaskAction(id, updates);
    });
  }

  // --- Recurrence callbacks ---

  function handleSetRecurrence(taskId: string, rule: string | null) {
    if (rule) {
      const task = optimisticTasks.find((t) => t.id === taskId);
      if (task?.completed) {
        const tempMasterId = Math.random().toString(36).slice(2);
        startTransition(async () => {
          dispatchTasks({ type: "promoteToException", taskId, rule, tempMasterId });
          await setRecurrenceAction(taskId, rule);
        });
      } else {
        startTransition(async () => {
          dispatchTasks({ type: "setRecurrence", id: taskId, rule });
          await setRecurrenceAction(taskId, rule);
        });
      }
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
      scheduledDate: fields.scheduledDate ?? originalDate,
      scheduledStart: "scheduledStart" in fields ? (fields.scheduledStart ?? undefined) : master.scheduledStart,
      scheduledEnd: "scheduledEnd" in fields ? (fields.scheduledEnd ?? undefined) : master.scheduledEnd,
      completed: fields.completed ?? master.completed,
      cancelled: fields.cancelled ?? undefined,
      allDay: "allDay" in fields ? (fields.allDay ?? false) : (master.allDay ?? false),
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
      ...(updates.allDay             !== undefined && { allDay:           updates.allDay }),
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

  function handlePlanForDate(taskId: string, date: string) {
    startTransition(async () => {
      dispatchTasks({ type: "planForDate", id: taskId, date });
      await planTaskForDateAction(taskId, date);
    });
  }

  function handleCreateDueTodayException(parentId: string, originalDate: string, date: string) {
    handleCreateException(parentId, originalDate, {
      scheduledDate: date,
      allDay: false,
    });
  }

  // --- Copy callbacks ---

  function handleCopyTask(sourceId: string, date: string, start: string, end: string) {
    const source = optimisticTasks.find((t) => t.id === sourceId);
    if (!source) return;
    const tempId = Math.random().toString(36).slice(2);
    const copy: Task = {
      ...source,
      id: tempId,
      scheduledDate: date,
      scheduledStart: start,
      scheduledEnd: end,
      completed: false,
      recurrenceRule: undefined,
      recurringParentId: undefined,
      originalDate: undefined,
      isVirtualRecurrence: undefined,
    };
    startTransition(async () => {
      dispatchTasks({ type: "copy", task: copy });
      await copyAndScheduleTaskAction(sourceId, date, start, end);
    });
  }

  function handleCopyTaskAllDay(sourceId: string, date: string) {
    const source = optimisticTasks.find((t) => t.id === sourceId);
    if (!source) return;
    const tempId = Math.random().toString(36).slice(2);
    const copy: Task = {
      ...source,
      id: tempId,
      scheduledDate: date,
      scheduledStart: undefined,
      scheduledEnd: undefined,
      completed: false,
      recurrenceRule: undefined,
      recurringParentId: undefined,
      originalDate: undefined,
      isVirtualRecurrence: undefined,
    };
    startTransition(async () => {
      dispatchTasks({ type: "copy", task: copy });
      await copyAndScheduleTaskAction(sourceId, date);
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
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [visibleHours, setVisibleHours] = useState(16);
  const [quickCreate, setQuickCreate] = useState<{ date: string; start: string; end: string } | null>(null);

  function handleCreateTask(date: string, start: string, end: string) {
    setQuickCreate({ date, start, end });
  }

  function handleQuickCreateSave(title: string, start: string, end: string) {
    const { date } = quickCreate!;
    const tempId = Math.random().toString(36).slice(2);
    const task: Task = {
      id: tempId,
      title,
      completed: false,
      scheduledDate: date,
      scheduledStart: start,
      scheduledEnd: end,
    };
    setQuickCreate(null);
    startTransition(async () => {
      dispatchTasks({ type: "add", task });
      await addAndScheduleTaskAction(title, date, start, end);
    });
  }

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

      <div className={`flex-1 min-h-0 flex flex-col md:flex-row ${activeTab === "schedule" ? "" : "hidden"} md:flex`}>
        <div className="flex-1 min-h-0 flex flex-col">
        {/* Day / Week toggle — desktop only */}
        <div className="hidden md:flex items-center gap-1 px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <button
            onClick={() => setViewMode("day")}
            className={`px-3 py-0.5 text-xs font-medium rounded transition-colors ${
              viewMode === "day"
                ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={`px-3 py-0.5 text-xs font-medium rounded transition-colors ${
              viewMode === "week"
                ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            Week
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setVisibleHours((h) => Math.min(h + 1, 24))}
              disabled={visibleHours >= 24}
              className="w-5 h-5 flex items-center justify-center rounded text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Zoom out"
            >
              −
            </button>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums w-7 text-center select-none">
              {visibleHours}h
            </span>
            <button
              onClick={() => setVisibleHours((h) => Math.max(h - 1, 2))}
              disabled={visibleHours <= 2}
              className="w-5 h-5 flex items-center justify-center rounded text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
        </div>

        {viewMode === "day" ? (
          <SchedulePane
            tasks={expandedTasks}
            groups={optimisticGroups}
            visibleHours={visibleHours}
            onUpdateTask={updateTask}
            timezone={timezone}
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
            onCopyTask={handleCopyTask}
            onCopyTaskAllDay={handleCopyTaskAllDay}
            onToggleTask={toggleTask}
            onCreateTask={handleCreateTask}
            onPlanForDate={handlePlanForDate}
            onCreateDueTodayException={handleCreateDueTodayException}
          />
        ) : (
          <WeekPane
            tasks={optimisticTasks}
            groups={optimisticGroups}
            visibleHours={visibleHours}
            timezone={timezone}
            selectedDate={selectedDate}
            onChangeDate={setSelectedDate}
            onUpdateTask={updateTask}
            onScheduleTask={scheduleTask}
            onScheduleTaskAllDay={scheduleTaskAllDay}
            onDescheduleTask={descheduleTask}
            onRescheduleTask={rescheduleTask}
            onCreateGroup={handleCreateGroup}
            onSetRecurrence={handleSetRecurrence}
            onCreateException={handleCreateException}
            onUpdateAllOccurrences={handleUpdateAllOccurrences}
            onCancelOccurrence={handleCancelOccurrence}
            onCopyTask={handleCopyTask}
            onCopyTaskAllDay={handleCopyTaskAllDay}
            onToggleTask={toggleTask}
            onCreateTask={handleCreateTask}
            onPlanForDate={handlePlanForDate}
            onCreateDueTodayException={handleCreateDueTodayException}
          />
        )}
        </div>{/* end schedule/week column */}

        {/* Due Today pane — desktop day view only */}
        {viewMode === "day" && (
          <div className="hidden md:flex flex-col min-h-0 w-56 shrink-0 border-l border-zinc-200 dark:border-zinc-800">
            <DueTodayPane
              tasks={dueTodayTasks}
              groups={optimisticGroups}
              groupColorMap={Object.fromEntries(optimisticGroups.map((g) => [g.id, g.color]))}
              onPlanForDate={(id) => handlePlanForDate(id, selectedDate)}
              onCreateException={(parentId, originalDate) =>
                handleCreateDueTodayException(parentId, originalDate, selectedDate)
              }
              onToggleComplete={(task) => toggleTask(task.id)}
              onDeschedule={descheduleTask}
              onUpdateTask={updateTask}
              onCreateGroup={handleCreateGroup}
              onRescheduleTask={rescheduleTask}
              onSetRecurrence={handleSetRecurrence}
              onCreateExceptionFull={handleCreateException}
              onUpdateAllOccurrences={handleUpdateAllOccurrences}
              onCancelOccurrence={handleCancelOccurrence}
            />
          </div>
        )}

      </div>{/* end schedule+duetoday wrapper */}
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
          onScheduleCopy={handleCopyTask}
          onScheduleAllDayCopy={handleCopyTaskAllDay}
        />
      </div>

      {quickCreate && (
        <QuickCreateModal
          date={quickCreate.date}
          start={quickCreate.start}
          end={quickCreate.end}
          onSave={handleQuickCreateSave}
          onClose={() => setQuickCreate(null)}
        />
      )}
    </div>
  );
}
