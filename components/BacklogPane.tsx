"use client";

import { useState, useRef, useEffect } from "react";
import { Task, Group } from "@/types/task";
import BacklogTaskItem from "./BacklogTaskItem";
import AddTaskForm from "./AddTaskForm";
import TaskDetailModal from "./TaskDetailModal";

type Props = Readonly<{
  tasks: Task[];
  groups: Group[];
  onAddTask: (title: string, points?: number, description?: string, estimatedMinutes?: number, groupId?: string) => void;
  onToggleTask: (id: string) => void;
  onScheduleTask: (id: string, start: string, end: string, date: string) => void;
  onScheduleTaskAllDay: (id: string, date: string) => void;
  onDescheduleTask: (id: string) => void;
  onUpdateTask: (
    id: string,
    updates: Partial<Pick<Task, "title" | "description" | "points" | "estimatedMinutes" | "groupId">>
  ) => void;
  onCreateGroup: (name: string, color: string) => void;
  onUpdateGroup: (id: string, updates: Partial<Pick<Group, "name" | "color">>) => void;
  onDeleteGroup: (id: string, deleteTasks: boolean) => void;
  onScheduleCopy: (id: string, start: string, end: string, date: string) => void;
  onScheduleAllDayCopy: (id: string, date: string) => void;
}>;

export default function BacklogPane({
  tasks, groups, onAddTask, onToggleTask, onScheduleTask, onScheduleTaskAllDay,
  onDescheduleTask, onUpdateTask, onCreateGroup, onUpdateGroup, onDeleteGroup,
  onScheduleCopy, onScheduleAllDayCopy,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [formGroupId, setFormGroupId] = useState<string | undefined>(undefined);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const selectedTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId) ?? null
    : null;

  const backlogTasks = tasks.filter((t) => !t.scheduledDate && !t.cancelled);
  const incomplete = backlogTasks.filter((t) => !t.completed);
  const completed = backlogTasks.filter((t) => t.completed);

  const ungrouped = incomplete.filter((t) => !t.groupId);
  const grouped = groups
    .map((g) => ({ ...g, tasks: incomplete.filter((t) => t.groupId === g.id) }))
    .filter((g) => g.tasks.length > 0);

  function toggleCollapse(groupId: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function handleShowForm(groupId?: string) {
    setFormGroupId(groupId);
    setShowForm(true);
  }

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
          onClick={() => handleShowForm()}
          className="flex items-center gap-1 rounded-md bg-blue-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
        >
          + Add Task
        </button>
      </div>

      {/* Add task form */}
      {showForm && (
        <AddTaskForm
          groups={groups}
          defaultGroupId={formGroupId}
          onAdd={(title, points, description, estimatedMinutes, groupId) => {
            onAddTask(title, points, description, estimatedMinutes, groupId);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
          onCreateGroup={onCreateGroup}
        />
      )}

      {/* Task list (drop target for descheduling) */}
      <section
        aria-label="Backlog tasks"
        className={`flex-1 overflow-y-auto transition-colors ${
          dragOver ? "bg-blue-50 dark:bg-blue-500/10 outline-2 outline-dashed outline-blue-400 -outline-offset-2" : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {ungrouped.length === 0 && grouped.length === 0 && completed.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-zinc-400">
            No tasks yet. Add one to get started.
          </p>
        )}

        {/* Ungrouped tasks */}
        <ul>
          {ungrouped.map((task) => (
            <BacklogTaskItem key={task.id} task={task} onSchedule={onScheduleTask} onScheduleAllDay={onScheduleTaskAllDay} onOpenDetail={setSelectedTaskId} onScheduleCopy={onScheduleCopy} onScheduleAllDayCopy={onScheduleAllDayCopy} />
          ))}
        </ul>

        {/* Group sections */}
        {grouped.map((group) => (
          <GroupSection
            key={group.id}
            group={group}
            tasks={group.tasks}
            collapsed={collapsedGroups.has(group.id)}
            onToggleCollapse={() => toggleCollapse(group.id)}
            onScheduleTask={onScheduleTask}
            onScheduleTaskAllDay={onScheduleTaskAllDay}
            onOpenDetail={setSelectedTaskId}
            onAddTask={() => handleShowForm(group.id)}
            onUpdateGroup={onUpdateGroup}
            onDeleteGroup={onDeleteGroup}
            onScheduleCopy={onScheduleCopy}
            onScheduleAllDayCopy={onScheduleAllDayCopy}
          />
        ))}

        {/* Completed section */}
        {completed.length > 0 && (
          <div className="mt-2">
            <div className="px-4 py-1.5 text-xs text-zinc-400 dark:text-zinc-500 font-medium">
              Completed ({completed.length})
            </div>
            <ul>
              {completed.map((task) => (
                <BacklogTaskItem key={task.id} task={task} onSchedule={onScheduleTask} onScheduleAllDay={onScheduleTaskAllDay} onOpenDetail={setSelectedTaskId} onScheduleCopy={onScheduleCopy} onScheduleAllDayCopy={onScheduleAllDayCopy} />
              ))}
            </ul>
          </div>
        )}
      </section>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          groups={groups}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={onUpdateTask}
          onCreateGroup={onCreateGroup}
          onToggle={onToggleTask}
        />
      )}
    </div>
  );
}

// --- GroupSection sub-component ---

type GroupSectionProps = Readonly<{
  group: Group;
  tasks: Task[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onScheduleTask: (id: string, start: string, end: string, date: string) => void;
  onScheduleTaskAllDay: (id: string, date: string) => void;
  onOpenDetail: (id: string) => void;
  onAddTask: () => void;
  onUpdateGroup: (id: string, updates: Partial<Pick<Group, "name" | "color">>) => void;
  onDeleteGroup: (id: string, deleteTasks: boolean) => void;
  onScheduleCopy: (id: string, start: string, end: string, date: string) => void;
  onScheduleAllDayCopy: (id: string, date: string) => void;
}>;

function GroupSection({
  group, tasks, collapsed, onToggleCollapse,
  onScheduleTask, onScheduleTaskAllDay, onOpenDetail, onAddTask, onUpdateGroup, onDeleteGroup,
  onScheduleCopy, onScheduleAllDayCopy,
}: GroupSectionProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editColor, setEditColor] = useState(group.color);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  function handleSaveEdit() {
    const updates: Partial<Pick<Group, "name" | "color">> = {};
    const trimmed = editName.trim();
    if (trimmed && trimmed !== group.name) updates.name = trimmed;
    if (editColor !== group.color) updates.color = editColor;
    if (Object.keys(updates).length > 0) onUpdateGroup(group.id, updates);
    setEditing(false);
  }

  if (confirmingDelete) {
    return (
      <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 space-y-2">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Delete <span className="font-medium">{group.name}</span>?
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => { onDeleteGroup(group.id, false); setConfirmingDelete(false); }}
            className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded px-2 py-1 transition-colors"
          >
            Ungroup tasks
          </button>
          <button
            onClick={() => { onDeleteGroup(group.id, true); setConfirmingDelete(false); }}
            className="text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded px-2 py-1 transition-colors"
          >
            Delete tasks too
          </button>
          <button
            onClick={() => setConfirmingDelete(false)}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 ml-auto"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (editing) {
    const COLOR_PRESETS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#ec4899"];
    return (
      <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 space-y-2">
        <input
          autoFocus
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); }}
          className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-transparent px-2 py-1 text-sm outline-none focus:border-blue-500"
        />
        <div className="flex items-center gap-1.5">
          {COLOR_PRESETS.map((hex) => (
            <button
              key={hex}
              onClick={() => setEditColor(hex)}
              className={`w-5 h-5 rounded-full border-2 transition-colors ${
                editColor === hex ? "border-zinc-800 dark:border-zinc-200" : "border-transparent"
              }`}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSaveEdit}
            className="text-xs font-medium text-white bg-blue-500 rounded px-2 py-1 hover:bg-blue-600 transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800">
      {/* Group header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/60">
        <button onClick={onToggleCollapse} className="flex items-center gap-2 flex-1 min-w-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform ${collapsed ? "" : "rotate-90"}`}
          >
            <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">{group.name}</span>
          <span className="text-xs text-zinc-400 tabular-nums">{tasks.length}</span>
        </button>

        <button
          onClick={onAddTask}
          className="text-xs text-blue-500 hover:text-blue-600 font-medium shrink-0"
        >
          + Add
        </button>

        {/* Overflow menu */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg py-1 w-36">
              <button
                onClick={() => {
                  setEditName(group.name);
                  setEditColor(group.color);
                  setEditing(true);
                  setMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Edit group
              </button>
              <button
                onClick={() => { setConfirmingDelete(true); setMenuOpen(false); }}
                className="w-full px-3 py-1.5 text-left text-sm text-red-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Delete group
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Group tasks */}
      {!collapsed && (
        <ul className="ml-4 border-l-2" style={{ borderColor: group.color }}>
          {tasks.map((task) => (
            <BacklogTaskItem key={task.id} task={task} onSchedule={onScheduleTask} onScheduleAllDay={onScheduleTaskAllDay} onOpenDetail={onOpenDetail} onScheduleCopy={onScheduleCopy} onScheduleAllDayCopy={onScheduleAllDayCopy} />
          ))}
        </ul>
      )}
    </div>
  );
}
