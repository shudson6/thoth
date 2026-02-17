-- Planner schema
-- Usage: psql -U <user> -d <dbname> -f db/schema.sql

-- Trigger function: auto-update updated_at on row change
CREATE FUNCTION update_updated_at() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- App-wide key-value settings (e.g. timezone)
CREATE TABLE settings (
    key   text PRIMARY KEY,
    value text NOT NULL
);

-- Tasks
CREATE TABLE tasks (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    title               text        NOT NULL,
    description         text,
    points              smallint,
    completed           boolean     NOT NULL DEFAULT false,
    scheduled_date      date,
    scheduled_start     time,
    scheduled_end       time,
    timezone            text,
    position            integer     NOT NULL DEFAULT 0,
    recurrence_rule     text,
    recurring_parent_id uuid        REFERENCES tasks(id) ON DELETE CASCADE,
    original_date       date,
    cancelled           boolean     NOT NULL DEFAULT false,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),

    -- If scheduled, all three scheduling columns must be present
    CONSTRAINT scheduled_fields_together CHECK (
        (scheduled_date IS NULL AND scheduled_start IS NULL AND scheduled_end IS NULL)
        OR
        (scheduled_date IS NOT NULL AND scheduled_start IS NOT NULL AND scheduled_end IS NOT NULL)
    ),

    -- End must be after start
    CONSTRAINT scheduled_end_after_start CHECK (scheduled_end > scheduled_start),

    -- Exception instances must reference a parent and specify which date they replace
    CONSTRAINT exception_fields_together CHECK (
        (recurring_parent_id IS NULL AND original_date IS NULL)
        OR
        (recurring_parent_id IS NOT NULL AND original_date IS NOT NULL)
    ),

    -- A master task cannot also be an exception
    CONSTRAINT not_both_master_and_exception CHECK (
        NOT (recurrence_rule IS NOT NULL AND recurring_parent_id IS NOT NULL)
    ),

    -- Only one exception per parent + date
    CONSTRAINT unique_exception_per_date UNIQUE (recurring_parent_id, original_date)
);

-- Indexes
CREATE INDEX idx_tasks_scheduled_date   ON tasks (scheduled_date)      WHERE scheduled_date IS NOT NULL;
CREATE INDEX idx_tasks_backlog          ON tasks (position)            WHERE scheduled_date IS NULL;
CREATE INDEX idx_tasks_recurring_parent ON tasks (recurring_parent_id) WHERE recurring_parent_id IS NOT NULL;
CREATE INDEX idx_tasks_recurrence       ON tasks (id)                  WHERE recurrence_rule IS NOT NULL;

-- Auto-update updated_at on every UPDATE
CREATE TRIGGER tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
