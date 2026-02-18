-- Migration 003: recurrence support
-- Adds recurrence_rule, recurring_parent_id, original_date, cancelled, timezone
-- to the tasks table, along with the associated constraints and indexes.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS timezone            text,
  ADD COLUMN IF NOT EXISTS recurrence_rule     text,
  ADD COLUMN IF NOT EXISTS recurring_parent_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS original_date       date,
  ADD COLUMN IF NOT EXISTS cancelled           boolean NOT NULL DEFAULT false;

ALTER TABLE tasks
  ADD CONSTRAINT exception_fields_together CHECK (
    (recurring_parent_id IS NULL AND original_date IS NULL)
    OR
    (recurring_parent_id IS NOT NULL AND original_date IS NOT NULL)
  ),
  ADD CONSTRAINT not_both_master_and_exception CHECK (
    NOT (recurrence_rule IS NOT NULL AND recurring_parent_id IS NOT NULL)
  ),
  ADD CONSTRAINT unique_exception_per_date
    UNIQUE (recurring_parent_id, original_date);

CREATE INDEX IF NOT EXISTS idx_tasks_recurring_parent
  ON tasks (recurring_parent_id) WHERE recurring_parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_recurrence
  ON tasks (id) WHERE recurrence_rule IS NOT NULL;
