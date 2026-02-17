"use server";

import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

export async function addTask(
  title: string,
  points?: number,
  description?: string,
  estimatedMinutes?: number,
  groupId?: string
) {
  const { rows } = await pool.query(
    `INSERT INTO tasks (title, points, description, estimated_minutes, group_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [title, points ?? null, description ?? null, estimatedMinutes ?? null, groupId ?? null]
  );
  revalidatePath("/");
  return rows[0].id as string;
}

export async function toggleTask(id: string) {
  await pool.query(
    `UPDATE tasks SET completed = NOT completed, updated_at = now() WHERE id = $1`,
    [id]
  );
  revalidatePath("/");
}

export async function scheduleTask(id: string, start: string, end: string, date: string) {
  await pool.query(
    `UPDATE tasks
     SET scheduled_date = $2, scheduled_start = $3, scheduled_end = $4, updated_at = now()
     WHERE id = $1`,
    [id, date, start, end]
  );
  revalidatePath("/");
}

export async function descheduleTask(id: string) {
  await pool.query(
    `UPDATE tasks
     SET scheduled_date = NULL, scheduled_start = NULL, scheduled_end = NULL, updated_at = now()
     WHERE id = $1`,
    [id]
  );
  revalidatePath("/");
}

export async function scheduleTaskAllDay(id: string, date: string) {
  await pool.query(
    `UPDATE tasks
     SET scheduled_date = $2, scheduled_start = NULL, scheduled_end = NULL, updated_at = now()
     WHERE id = $1`,
    [id, date]
  );
  revalidatePath("/");
}

export async function updateTask(
  id: string,
  updates: { title?: string; description?: string; points?: number; estimatedMinutes?: number; groupId?: string | null }
) {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 2; // $1 is id

  if (updates.title !== undefined) {
    sets.push(`title = $${i++}`);
    vals.push(updates.title);
  }
  if (updates.description !== undefined) {
    sets.push(`description = $${i++}`);
    vals.push(updates.description);
  }
  if (updates.points !== undefined) {
    sets.push(`points = $${i++}`);
    vals.push(updates.points);
  }
  if (updates.estimatedMinutes !== undefined) {
    sets.push(`estimated_minutes = $${i++}`);
    vals.push(updates.estimatedMinutes || null);
  }
  if (updates.groupId !== undefined) {
    sets.push(`group_id = $${i++}`);
    vals.push(updates.groupId);
  }

  if (sets.length === 0) return;

  sets.push(`updated_at = now()`);
  await pool.query(
    `UPDATE tasks SET ${sets.join(", ")} WHERE id = $1`,
    [id, ...vals]
  );
  revalidatePath("/");
}

export async function createGroup(name: string, color?: string) {
  const { rows } = await pool.query(
    `INSERT INTO groups (name, color) VALUES ($1, $2) RETURNING id`,
    [name, color ?? "#3b82f6"]
  );
  revalidatePath("/");
  return rows[0].id as string;
}

export async function updateGroup(
  id: string,
  updates: { name?: string; color?: string }
) {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 2;

  if (updates.name !== undefined) {
    sets.push(`name = $${i++}`);
    vals.push(updates.name);
  }
  if (updates.color !== undefined) {
    sets.push(`color = $${i++}`);
    vals.push(updates.color);
  }

  if (sets.length === 0) return;

  await pool.query(
    `UPDATE groups SET ${sets.join(", ")} WHERE id = $1`,
    [id, ...vals]
  );
  revalidatePath("/");
}

export async function deleteGroup(id: string, deleteTasks: boolean) {
  if (deleteTasks) {
    await pool.query(`DELETE FROM tasks WHERE group_id = $1`, [id]);
  }
  await pool.query(`DELETE FROM groups WHERE id = $1`, [id]);
  revalidatePath("/");
}
