import { pool } from "./db";
import { Task, Group } from "@/types/task";

export async function getTasks(): Promise<Task[]> {
  const { rows } = await pool.query(
    `SELECT id, title, description, points, completed,
            scheduled_date, scheduled_start, scheduled_end, estimated_minutes, group_id
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
    if (r.estimated_minutes != null) task.estimatedMinutes = r.estimated_minutes;
    if (r.group_id) task.groupId = r.group_id;
    return task;
  });
}

export async function getGroups(): Promise<Group[]> {
  const { rows } = await pool.query(
    `SELECT id, name, color FROM groups ORDER BY position, name`
  );
  return rows.map((r) => ({ id: r.id, name: r.name, color: r.color }));
}
