export type Task = {
  id: string;
  title: string;
  points?: number;
  completed: boolean;
  scheduledStart?: string; // "HH:MM" e.g. "09:00"
  scheduledEnd?: string;   // "HH:MM" e.g. "10:30"
};
