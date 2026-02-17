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
};

export type Group = {
  id: string;
  name: string;
  color: string;
};
