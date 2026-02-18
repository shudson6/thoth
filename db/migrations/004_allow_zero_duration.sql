-- Migration 004: allow zero-duration scheduled tasks (start = end)
ALTER TABLE tasks
  DROP CONSTRAINT scheduled_end_after_start,
  ADD CONSTRAINT scheduled_end_after_start CHECK (scheduled_end >= scheduled_start);
