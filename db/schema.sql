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

-- Task groups
CREATE TABLE groups (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text NOT NULL UNIQUE,
    color      text NOT NULL DEFAULT '#3b82f6',
    position   integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
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
    estimated_minutes   smallint CHECK (estimated_minutes > 0),
    group_id            uuid        REFERENCES groups(id) ON DELETE SET NULL,
    timezone            text,
    position            integer     NOT NULL DEFAULT 0,
    recurrence_rule     text,
    recurring_parent_id uuid        REFERENCES tasks(id) ON DELETE CASCADE,
    original_date       date,
    cancelled           boolean     NOT NULL DEFAULT false,
    all_day             boolean     NOT NULL DEFAULT false,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),

    -- Scheduling: four valid states:
    --   backlog:    scheduled_date IS NULL,  scheduled_start IS NULL, all_day = false
    --   due-today:  scheduled_date IS NOT NULL, scheduled_start IS NULL, all_day = false
    --   all-day:    scheduled_date IS NOT NULL, scheduled_start IS NULL, all_day = true
    --   timed:      scheduled_date IS NOT NULL, scheduled_start IS NOT NULL, all_day = false
    CONSTRAINT scheduled_fields_together CHECK (
        (scheduled_date IS NULL AND scheduled_start IS NULL AND scheduled_end IS NULL)
        OR
        (scheduled_date IS NOT NULL AND scheduled_start IS NULL AND scheduled_end IS NULL)
        OR
        (scheduled_date IS NOT NULL AND scheduled_start IS NOT NULL AND scheduled_end IS NOT NULL)
    ),

    -- all_day=true is only valid for date-only rows (no time, date required)
    CONSTRAINT all_day_only_for_date_only CHECK (
        NOT (all_day = true AND (scheduled_date IS NULL OR scheduled_start IS NOT NULL))
    ),

    -- End must be at or after start (equal = zero-duration/instant task)
    CONSTRAINT scheduled_end_after_start CHECK (scheduled_end >= scheduled_start),

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
CREATE INDEX idx_tasks_group            ON tasks (group_id)            WHERE group_id IS NOT NULL;

-- Auto-update updated_at on every UPDATE
CREATE TRIGGER tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
