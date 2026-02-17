BEGIN;

CREATE TABLE groups (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text NOT NULL UNIQUE,
    color      text NOT NULL DEFAULT '#3b82f6',
    position   integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ADD COLUMN group_id uuid REFERENCES groups(id) ON DELETE SET NULL;
CREATE INDEX idx_tasks_group ON tasks (group_id) WHERE group_id IS NOT NULL;

COMMIT;
