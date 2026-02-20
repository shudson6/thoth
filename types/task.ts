export type Task = {
  id: string;
  title: string;
  description?: string;
  points?: number;
  completed: boolean;
  scheduledDate?: string;  // "YYYY-MM-DD" e.g. "2026-02-17"
  scheduledStart?: string; // "HH:MM" e.g. "09:00"
  scheduledEnd?: string;   // "HH:MM" e.g. "10:30"
  estimatedMinutes?: number;
  groupId?: string;
  allDay?: boolean;      // true = all-day strip; false/undefined = due-today pane (when date-only)

  // Recurrence (persisted)
  recurrenceRule?: string;     // RRULE string, present on master tasks
  recurringParentId?: string;  // Present on exception rows
  originalDate?: string;       // Date the exception replaces ("YYYY-MM-DD")
  cancelled?: boolean;         // true = this occurrence is suppressed

  // Client-side only — never sent to the server
  isVirtualRecurrence?: true;  // Expanded from master; no DB row yet
};

export type Group = {
  id: string;
  name: string;
  color: string;
};
