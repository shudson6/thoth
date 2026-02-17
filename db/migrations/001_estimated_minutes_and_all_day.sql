BEGIN;
ALTER TABLE tasks ADD COLUMN estimated_minutes smallint CHECK (estimated_minutes > 0);
ALTER TABLE tasks DROP CONSTRAINT scheduled_fields_together;
ALTER TABLE tasks ADD CONSTRAINT scheduled_fields_together CHECK (
  (scheduled_date IS NULL AND scheduled_start IS NULL AND scheduled_end IS NULL) OR
  (scheduled_date IS NOT NULL AND scheduled_start IS NULL AND scheduled_end IS NULL) OR
  (scheduled_date IS NOT NULL AND scheduled_start IS NOT NULL AND scheduled_end IS NOT NULL)
);
COMMIT;
