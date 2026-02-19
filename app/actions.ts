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

// --- Recurrence actions ---

export async function setRecurrence(taskId: string, rule: string) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT completed, title, description, points, estimated_minutes, group_id,
              scheduled_date, scheduled_start, scheduled_end
       FROM tasks WHERE id = $1`,
      [taskId]
    );
    if (rows.length === 0) throw new Error(`Task ${taskId} not found`);
    const t = rows[0];

    if (!t.completed) {
      await client.query(
        `UPDATE tasks SET recurrence_rule = $2, updated_at = now() WHERE id = $1`,
        [taskId, rule]
      );
    } else {
      await client.query("BEGIN");

      const { rows: masterRows } = await client.query(
        `INSERT INTO tasks
           (title, description, points, estimated_minutes, group_id,
            scheduled_date, scheduled_start, scheduled_end,
            recurrence_rule, completed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,false)
         RETURNING id`,
        [
          t.title, t.description, t.points, t.estimated_minutes, t.group_id,
          t.scheduled_date, t.scheduled_start, t.scheduled_end, rule,
        ]
      );
      const newMasterId = masterRows[0].id;

      await client.query(
        `UPDATE tasks
         SET recurring_parent_id = $2,
             original_date       = $3,
             recurrence_rule     = NULL,
             updated_at          = now()
         WHERE id = $1`,
        [taskId, newMasterId, t.scheduled_date]
      );

      await client.query("COMMIT");
    }
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  revalidatePath("/");
}

export async function removeRecurrence(taskId: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM tasks WHERE recurring_parent_id = $1`, [taskId]);
    await client.query(
      `UPDATE tasks SET recurrence_rule = NULL, updated_at = now() WHERE id = $1`,
      [taskId]
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  revalidatePath("/");
}

export async function createException(
  parentId: string,
  originalDate: string,
  fields: {
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
  }
): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch master to inherit template values
    const { rows } = await client.query(
      `SELECT title, description, points, estimated_minutes, group_id,
              scheduled_date, scheduled_start, scheduled_end
       FROM tasks WHERE id = $1`,
      [parentId]
    );
    if (rows.length === 0) throw new Error(`Master task ${parentId} not found`);
    const m = rows[0];

    const title           = fields.title           ?? m.title;
    const description     = "description"     in fields ? fields.description     : m.description;
    const points          = "points"          in fields ? fields.points          : m.points;
    const estimatedMin    = "estimatedMinutes" in fields ? fields.estimatedMinutes : m.estimated_minutes;
    const groupId         = "groupId"         in fields ? fields.groupId         : m.group_id;
    const scheduledDate   = fields.scheduledDate   ?? m.scheduled_date;
    const scheduledStart  = "scheduledStart"  in fields ? fields.scheduledStart  : m.scheduled_start;
    const scheduledEnd    = "scheduledEnd"    in fields ? fields.scheduledEnd    : m.scheduled_end;
    const completed       = fields.completed  ?? false;
    const cancelled       = fields.cancelled  ?? false;

    const result = await client.query(
      `INSERT INTO tasks
         (title, description, points, estimated_minutes, group_id,
          scheduled_date, scheduled_start, scheduled_end,
          completed, cancelled, recurring_parent_id, original_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (recurring_parent_id, original_date)
       DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         points = EXCLUDED.points,
         estimated_minutes = EXCLUDED.estimated_minutes,
         group_id = EXCLUDED.group_id,
         scheduled_date = EXCLUDED.scheduled_date,
         scheduled_start = EXCLUDED.scheduled_start,
         scheduled_end = EXCLUDED.scheduled_end,
         completed = EXCLUDED.completed,
         cancelled = EXCLUDED.cancelled,
         updated_at = now()
       RETURNING id`,
      [
        title, description ?? null, points ?? null, estimatedMin ?? null, groupId ?? null,
        scheduledDate, scheduledStart ?? null, scheduledEnd ?? null,
        completed, cancelled, parentId, originalDate,
      ]
    );

    await client.query("COMMIT");
    revalidatePath("/");
    return result.rows[0].id as string;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function updateAllOccurrences(
  masterId: string,
  updates: {
    title?: string;
    description?: string | null;
    points?: number | null;
    estimatedMinutes?: number | null;
    groupId?: string | null;
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
    recurrenceRule?: string;
  }
) {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 2;

  if (updates.title !== undefined)          { sets.push(`title = $${i++}`);             vals.push(updates.title); }
  if (updates.description !== undefined)    { sets.push(`description = $${i++}`);       vals.push(updates.description); }
  if (updates.points !== undefined)         { sets.push(`points = $${i++}`);            vals.push(updates.points); }
  if (updates.estimatedMinutes !== undefined){ sets.push(`estimated_minutes = $${i++}`); vals.push(updates.estimatedMinutes || null); }
  if (updates.groupId !== undefined)        { sets.push(`group_id = $${i++}`);          vals.push(updates.groupId); }
  if (updates.scheduledStart !== undefined) { sets.push(`scheduled_start = $${i++}`);  vals.push(updates.scheduledStart); }
  if (updates.scheduledEnd !== undefined)   { sets.push(`scheduled_end = $${i++}`);    vals.push(updates.scheduledEnd); }
  if (updates.recurrenceRule !== undefined) { sets.push(`recurrence_rule = $${i++}`);  vals.push(updates.recurrenceRule); }

  if (sets.length === 0) return;
  sets.push(`updated_at = now()`);

  await pool.query(
    `UPDATE tasks SET ${sets.join(", ")} WHERE id = $1`,
    [masterId, ...vals]
  );
  revalidatePath("/");
}

export async function copyAndScheduleTask(
  sourceId: string,
  date: string,
  start?: string,
  end?: string
): Promise<string> {
  const { rows: src } = await pool.query(
    `SELECT title, description, points, estimated_minutes, group_id FROM tasks WHERE id = $1`,
    [sourceId]
  );
  if (src.length === 0) throw new Error(`Task ${sourceId} not found`);
  const s = src[0];
  const { rows } = await pool.query(
    `INSERT INTO tasks (title, description, points, estimated_minutes, group_id, scheduled_date, scheduled_start, scheduled_end)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [s.title, s.description ?? null, s.points ?? null, s.estimated_minutes ?? null, s.group_id ?? null,
     date, start ?? null, end ?? null]
  );
  revalidatePath("/");
  return rows[0].id as string;
}

// --- Group actions ---

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
