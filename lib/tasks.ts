import { pool } from "./db";
import { Task } from "@/types/task";

export async function getTasks(): Promise<Task[]> {
  const { rows } = await pool.query(
    `SELECT id, title, description, points, completed,
            scheduled_date, scheduled_start, scheduled_end
     FROM tasks
     WHERE cancelled = false
     ORDER BY position, created_at`
  );

  return rows.map((r) => {
    const task: Task = {
      id: r.id,
      title: r.title,
      completed: r.completed,
    };
    if (r.description) task.description = r.description;
    if (r.points != null) task.points = r.points;
    if (r.scheduled_date) task.scheduledDate = r.scheduled_date;
    if (r.scheduled_start) task.scheduledStart = r.scheduled_start.slice(0, 5); // "HH:MM:SS" → "HH:MM"
    if (r.scheduled_end) task.scheduledEnd = r.scheduled_end.slice(0, 5);
    return task;
  });
}
