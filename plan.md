# Personal View — Implementation Plan

## Overview

The personal view is a two-pane layout: a **Schedule** (vertical 24-hour timeline) on the left and a **Task Backlog** on the right. Tasks live in the backlog until scheduled, and eventually can be dragged onto the schedule (drag-and-drop is a later milestone).

---

## Layout

```
┌──────────────────────────────┬─────────────────────┐
│                              │                     │
│        Schedule Pane         │   Task Backlog Pane  │
│        (60-70% width)        │   (30-40% width)     │
│                              │                     │
│   7:00 ─────────────         │  [ + Add Task ]     │
│   8:00 ─────────────         │                     │
│   9:00 ┌─ Meeting ──┐       │  ☐ Buy groceries    │
│  10:00 └────────────┘       │  ☐ Write report     │
│  11:00 ─────────────         │  ☐ Call dentist     │
│     ...                      │     ...             │
│                              │                     │
└──────────────────────────────┴─────────────────────┘
```

- Full-viewport height, no page scroll — each pane scrolls independently.
- The schedule pane gets ~65% width; the backlog pane gets ~35%.
- A clear visual divider separates the two panes.

---

## Schedule Pane

- **24 hour rows** (00:00–23:00), each row a fixed height (e.g. 64px).
- **16 hours visible** by default without scrolling — this means the pane's visible area fits 16 rows, so each row height = `viewport height / 16`. The remaining 8 hours are accessible by scrolling.
- The schedule auto-scrolls to a sensible default on load (e.g. 6:00 AM at top).
- Hour labels sit in a narrow left gutter; the rest of the row is available for task blocks.
- A thin horizontal line marks the current time and updates live.
- Scheduled tasks render as colored blocks spanning their time range.

### Task blocks on the schedule

- Positioned absolutely within the scrollable area based on start time and duration.
- Show the task title (and point value if set).
- Clicking a block opens an edit/detail view (future milestone).

---

## Task Backlog Pane

- A vertically scrollable list of unscheduled tasks.
- Each task shows: checkbox, title, and point value (if any).
- An **"+ Add Task"** button at the top opens an inline form or modal to create a new task.
- New task form fields (minimal for now):
  - **Title** (required)
  - **Points** (optional number input)
- Tasks can be checked off (marked complete) directly from the backlog.

---

## Data Model

All state lives in React client state for now (no database). We'll use a single `Task` type:

```ts
type Task = {
  id: string;           // crypto.randomUUID()
  title: string;
  points?: number;
  completed: boolean;
  scheduledStart?: string;  // ISO time string, e.g. "09:00"
  scheduledEnd?: string;    // ISO time string, e.g. "10:30"
};
```

- A task with `scheduledStart`/`scheduledEnd` appears on the schedule.
- A task without them appears in the backlog.
- Persistence (localStorage or a database) is a later concern.

---

## File Structure

```
app/
  page.tsx                  — Replace boilerplate; render PersonalView
  globals.css               — Keep, extend with any needed custom properties
  layout.tsx                — Update metadata (title → "Planner")

components/
  PersonalView.tsx          — Top-level two-pane layout (client component)
  SchedulePane.tsx          — 24-hour vertical schedule
  ScheduleTaskBlock.tsx     — A single task block rendered on the schedule
  BacklogPane.tsx           — Task list + add button
  BacklogTaskItem.tsx       — A single task row in the backlog
  AddTaskForm.tsx           — Inline form for creating a new task

types/
  task.ts                   — Task type definition
```

---

## Implementation Steps

### 1. Scaffolding & types
- Create `types/task.ts` with the `Task` type.
- Update `app/layout.tsx` metadata (title/description).
- Replace `app/page.tsx` boilerplate with the `PersonalView` component.

### 2. Two-pane layout (`PersonalView`)
- Full-viewport flex container (`h-screen flex`).
- Left child (schedule) gets `flex: 1` / ~65%.
- Right child (backlog) gets `w-[35%]` with a left border divider.
- State: a `tasks` array managed with `useState`.

### 3. Schedule pane
- Render 24 hour rows inside a scrollable container.
- Calculate row height dynamically: `container height / 16` so 16 hours fit.
- On mount, scroll to ~6:00 AM.
- Render a "current time" indicator line.
- Overlay scheduled tasks as absolutely-positioned blocks.

### 4. Backlog pane
- Render the "+" button at the top.
- List unscheduled, incomplete tasks.
- Each item has a checkbox to toggle completion.

### 5. Add Task form
- Clicking "+" reveals an inline form at the top of the backlog (pushes list down).
- Title input + optional points input + Save/Cancel buttons.
- On save, append to the tasks array; the task appears in the backlog.

---

## Styling Approach

- Tailwind utility classes throughout — no additional CSS libraries needed.
- Lean on the existing Geist font and light/dark theme variables from `globals.css`.
- Keep it clean and minimal: neutral background, subtle borders, readable type.

---

## What's Deferred

- Drag-and-drop from backlog to schedule (future milestone).
- Persistence (localStorage or database).
- Family view.
- Task editing/deletion.
- Responsive / mobile layout.
