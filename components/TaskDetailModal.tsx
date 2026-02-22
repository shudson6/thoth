"use client";

import { useState, useEffect } from "react";
import { Task, Group } from "@/types/task";
import { formatEstimate, timeToMinutes, minutesToTime } from "@/lib/time";
import { describeRRule } from "@/lib/recurrence";
import GroupPicker from "./GroupPicker";
import RecurrencePicker from "./RecurrencePicker";
import RecurrenceScopeDialog from "./RecurrenceScopeDialog";

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

type Props = Readonly<{
  task: Task;
  groups: Group[];
  onClose: () => void;
  onUpdate: (
    id: string,
    updates: Partial<Pick<Task, "title" | "description" | "points" | "estimatedMinutes" | "groupId" | "allDay">>
  ) => void;
  onCreateGroup: (name: string, color: string) => void;
  onToggle?: (id: string) => void;
  onDeschedule?: (id: string) => void;
  onReschedule?: (
    id: string,
    date: string,
    start: string | undefined,
    end: string | undefined
  ) => void;
  onSetRecurrence?: (taskId: string, rule: string | null) => void;
  onCreateException?: (parentId: string, originalDate: string, fields: ExceptionFields) => void;
  onUpdateAllOccurrences?: (masterId: string, updates: Partial<Task>) => void;
}>;

function formatScheduledDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  let hour = h;
  if (h === 0) hour = 12;
  else if (h > 12) hour = h - 12;
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export default function TaskDetailModal({
  task, groups, onClose, onUpdate, onCreateGroup,
  onToggle, onDeschedule, onReschedule, onSetRecurrence, onCreateException, onUpdateAllOccurrences,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [showScopeDialog, setShowScopeDialog] = useState(false);

  // Metadata fields
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [points, setPoints] = useState(task.points?.toString() ?? "");
  const [estimate, setEstimate] = useState(task.estimatedMinutes?.toString() ?? "");
  const [groupId, setGroupId] = useState<string | null>(task.groupId ?? null);

  // Schedule fields
  const [scheduledDate, setScheduledDate] = useState(task.scheduledDate ?? "");
  const [scheduledStart, setScheduledStart] = useState(task.scheduledStart ?? "");
  const [scheduledEnd, setScheduledEnd] = useState(task.scheduledEnd ?? "");
  const [isAllDay, setIsAllDay] = useState(!task.scheduledStart && !task.scheduledEnd);
  // Whether the date-only task is an all-day event (true) or due-today (false)
  const [allDayEvent, setAllDayEvent] = useState(task.allDay ?? false);

  // Recurrence field
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(task.recurrenceRule ?? null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    globalThis.addEventListener("keydown", handleKey);
    return () => globalThis.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function startEditing() {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPoints(task.points?.toString() ?? "");
    setEstimate(task.estimatedMinutes?.toString() ?? "");
    setGroupId(task.groupId ?? null);
    setScheduledDate(task.scheduledDate ?? "");
    setScheduledStart(task.scheduledStart ?? "");
    setScheduledEnd(task.scheduledEnd ?? "");
    setIsAllDay(!task.scheduledStart && !task.scheduledEnd);
    setAllDayEvent(task.allDay ?? false);
    setRecurrenceRule(task.recurrenceRule ?? null);
    setShowScopeDialog(false);
    setEditing(true);
  }

  function handleScheduledStartChange(newStart: string) {
    const parsedEstimate = estimate ? Number(estimate) : null;
    const newStartMin = timeToMinutes(newStart);
    if (parsedEstimate != null && scheduledStart) {
      setScheduledEnd(minutesToTime(Math.min(newStartMin + parsedEstimate, 24 * 60 - 1)));
    } else if (scheduledEnd) {
      const delta = newStartMin - timeToMinutes(scheduledStart);
      const newEndMin = Math.min(Math.max(timeToMinutes(scheduledEnd) + delta, newStartMin), 24 * 60 - 1);
      setScheduledEnd(minutesToTime(newEndMin));
    }
    setScheduledStart(newStart);
  }

  function handleEstimateChange(newEstimate: string) {
    const parsedEstimate = newEstimate ? Number(newEstimate) : null;
    if (parsedEstimate != null && scheduledStart) {
      setScheduledEnd(minutesToTime(Math.min(timeToMinutes(scheduledStart) + parsedEstimate, 24 * 60 - 1)));
    }
    setEstimate(newEstimate);
  }

  // Collect all pending changes without committing them
  function collectChanges() {
    const metaUpdates: Partial<Pick<Task, "title" | "description" | "points" | "estimatedMinutes" | "groupId" | "allDay">> = {};
    const trimmedTitle = title.trim();
    if (trimmedTitle && trimmedTitle !== task.title) metaUpdates.title = trimmedTitle;
    if (description !== (task.description ?? "")) metaUpdates.description = description || undefined;
    const parsedPoints = points ? Number(points) : undefined;
    if (parsedPoints !== task.points) metaUpdates.points = parsedPoints;
    const parsedEstimate = estimate ? Number(estimate) : undefined;
    if (parsedEstimate !== task.estimatedMinutes) metaUpdates.estimatedMinutes = parsedEstimate;
    const newGroupId = groupId ?? undefined;
    if (newGroupId !== task.groupId) metaUpdates.groupId = newGroupId;

    const newStart = isAllDay ? undefined : scheduledStart || undefined;
    const newEnd   = isAllDay ? undefined : scheduledEnd   || undefined;
    const scheduleChanged =
      scheduledDate !== (task.scheduledDate ?? "") ||
      newStart !== task.scheduledStart ||
      newEnd   !== task.scheduledEnd;

    const ruleChanged = recurrenceRule !== (task.recurrenceRule ?? null);

    // allDayEvent only applies when the task has no time
    const effectiveAllDayEvent = isAllDay ? allDayEvent : false;
    const allDayChanged = effectiveAllDayEvent !== (task.allDay ?? false);
    if (allDayChanged) metaUpdates.allDay = effectiveAllDayEvent;

    return { metaUpdates, newStart, newEnd, scheduleChanged, ruleChanged, allDayChanged, effectiveAllDayEvent };
  }

  function handleSave() {
    const isRecurring = !!(task.recurrenceRule || task.recurringParentId || task.isVirtualRecurrence);

    if (isRecurring) {
      setShowScopeDialog(true);
      return;
    }

    // Non-recurring: commit immediately
    const { metaUpdates, newStart, newEnd, scheduleChanged, ruleChanged } = collectChanges();
    if (Object.keys(metaUpdates).length > 0) onUpdate(task.id, metaUpdates);
    if (scheduleChanged && onReschedule) {
      onReschedule(task.id, scheduledDate, newStart, newEnd);
    }
    if (ruleChanged && onSetRecurrence) {
      onSetRecurrence(task.id, recurrenceRule);
    }
    setEditing(false);
  }


  function handleScopeThisOnly() {
    const { metaUpdates, newStart, newEnd, scheduleChanged, allDayChanged, effectiveAllDayEvent } = collectChanges();

    // Determine masterId and occurrenceDate
    const masterId = task.recurringParentId ?? task.id;
    const occurrenceDate = task.originalDate ?? task.scheduledDate!;

    const fields: ExceptionFields = {
      ...metaUpdates,
      estimatedMinutes: metaUpdates.estimatedMinutes,
    };
    if (scheduleChanged) {
      fields.scheduledDate  = scheduledDate;
      fields.scheduledStart = newStart ?? null;
      fields.scheduledEnd   = newEnd   ?? null;
    }
    if (allDayChanged) {
      fields.allDay = effectiveAllDayEvent;
    }
    // Note: recurrence rule changes are master-level; "this only" ignores them

    if (onCreateException) {
      onCreateException(masterId, occurrenceDate, fields);
    }
    setEditing(false);
    onClose();
  }

  function handleScopeAll() {
    const { metaUpdates, newStart, newEnd, scheduleChanged, ruleChanged, allDayChanged, effectiveAllDayEvent } = collectChanges();
    const masterId = task.recurringParentId ?? task.id;

    const masterUpdates: Partial<Task> = { ...metaUpdates };
    if (scheduleChanged) {
      masterUpdates.scheduledStart = newStart;
      masterUpdates.scheduledEnd   = newEnd;
    }
    if (allDayChanged) {
      masterUpdates.allDay = effectiveAllDayEvent;
    }
    if (Object.keys(masterUpdates).length > 0 && onUpdateAllOccurrences) {
      onUpdateAllOccurrences(masterId, masterUpdates);
    }
    if (scheduleChanged && onReschedule) {
      // Reschedule the master (its scheduledDate = first-occurrence date; updating
      // to the exception date would break the template, so only update times)
      onReschedule(masterId, task.scheduledDate ?? scheduledDate, newStart, newEnd);
    }
    if (ruleChanged && onSetRecurrence) {
      onSetRecurrence(masterId, recurrenceRule);
    }
    setEditing(false);
    onClose();
  }

  function handleToggle() {
    onToggle?.(task.id);
    onClose();
  }

  function handleCancel() {
    setShowScopeDialog(false);
    setEditing(false);
  }

  const taskGroup = groups.find((g) => g.id === task.groupId);
  const isRecurring = !!(task.recurrenceRule || task.recurringParentId || task.isVirtualRecurrence);

  let scheduleDisplay: string;
  if (task.scheduledStart && task.scheduledEnd) {
    scheduleDisplay = `${formatTime(task.scheduledStart)} – ${formatTime(task.scheduledEnd)}`;
  } else if (task.allDay) {
    scheduleDisplay = "All day";
  } else {
    scheduleDisplay = "Due today";
  }

  let recurrenceDisplay: string;
  if (task.recurrenceRule) {
    recurrenceDisplay = describeRRule(task.recurrenceRule);
  } else if (task.recurringParentId) {
    recurrenceDisplay = "Recurring (this occurrence)";
  } else {
    recurrenceDisplay = "Recurring";
  }

  return (
    <>
      <div aria-hidden="true" className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <dialog
        open
        aria-modal="true"
        aria-labelledby="task-detail-title"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 m-0 p-6 rounded-md bg-white dark:bg-zinc-900 shadow-lg border border-zinc-200 dark:border-zinc-700 w-full max-w-md"
      >
        {/* Top-right controls */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {!editing && (
            <button
              onClick={startEditing}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              title="Edit task"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="modal-title" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Title</label>
              <input
                id="modal-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="modal-description" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Description</label>
              <textarea
                id="modal-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="modal-points" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Points</label>
                <input
                  id="modal-points"
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  min={0}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="modal-estimate" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Estimate (min)</label>
                <input
                  id="modal-estimate"
                  type="number"
                  value={estimate}
                  onChange={(e) => handleEstimateChange(e.target.value)}
                  min={1}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {onReschedule && task.scheduledDate && (
              <div className="space-y-2">
                <label htmlFor="modal-sched-date" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Schedule</label>
                <input
                  id="modal-sched-date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isAllDay}
                    onChange={(e) => setIsAllDay(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-600"
                  />
                  <span>All day</span>
                </label>
                {isAllDay && (
                  <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer select-none pl-1">
                    <input
                      type="checkbox"
                      checked={allDayEvent}
                      onChange={(e) => setAllDayEvent(e.target.checked)}
                      className="rounded border-zinc-300 dark:border-zinc-600"
                    />
                    <span>All-day event</span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">(vs. due today)</span>
                  </label>
                )}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label htmlFor="modal-sched-start" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Start</label>
                    <input
                      id="modal-sched-start"
                      type="time"
                      value={scheduledStart}
                      onChange={(e) => handleScheduledStartChange(e.target.value)}
                      disabled={isAllDay}
                      className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="modal-sched-end" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">End</label>
                    <input
                      id="modal-sched-end"
                      type="time"
                      value={scheduledEnd}
                      onChange={(e) => setScheduledEnd(e.target.value)}
                      disabled={isAllDay || !!estimate}
                      className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
                    />
                  </div>
                </div>
              </div>
            )}
            <div>
              <p className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Group</p>
              <GroupPicker
                groups={groups}
                selectedGroupId={groupId}
                onChange={setGroupId}
                onCreateGroup={onCreateGroup}
              />
            </div>
            {onSetRecurrence && task.scheduledDate && (
              <div>
                <p className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Repeat</p>
                <RecurrencePicker
                  value={recurrenceRule}
                  anchorDate={task.scheduledDate}
                  onChange={setRecurrenceRule}
                />
              </div>
            )}
            {showScopeDialog ? (
              <RecurrenceScopeDialog
                onThisOnly={handleScopeThisOnly}
                onAll={handleScopeAll}
                onCancel={() => setShowScopeDialog(false)}
              />
            ) : (
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={handleCancel}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="rounded-md bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
                >
                  Save
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 pr-12">
            <h2 id="task-detail-title" className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
              {task.title}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
              {task.description || (
                <span className="italic text-zinc-400 dark:text-zinc-500">No description</span>
              )}
            </p>
            <div className="flex gap-2 flex-wrap">
              {taskGroup && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: taskGroup.color }}
                >
                  {taskGroup.name}
                </span>
              )}
              {task.points != null && (
                <span className="inline-block rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {task.points} pts
                </span>
              )}
              {task.estimatedMinutes != null && (
                <span className="inline-block rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {formatEstimate(task.estimatedMinutes)}
                </span>
              )}
            </div>
            {task.scheduledDate && (
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
                  <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
                </svg>
                <span>{formatScheduledDate(task.scheduledDate)}</span>
                <span>·</span>
                <span>
                  {scheduleDisplay}
                </span>
              </div>
            )}
            {isRecurring && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
                  <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
                </svg>
                <span>
                  {recurrenceDisplay}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 pt-1 flex-wrap">
              {onToggle && (
                <button
                  onClick={handleToggle}
                  className="text-xs font-medium text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {task.completed ? "Mark incomplete" : "Mark complete"}
                </button>
              )}
              {task.scheduledDate && onDeschedule && (
                <button
                  onClick={() => { onDeschedule(task.id); onClose(); }}
                  className="text-xs font-medium text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  {isRecurring ? "Remove this occurrence" : "Move to Backlog"}
                </button>
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
