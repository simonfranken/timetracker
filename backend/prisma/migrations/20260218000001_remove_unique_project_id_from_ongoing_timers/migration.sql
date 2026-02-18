-- Remove the erroneous UNIQUE constraint on ongoing_timers.project_id.
-- Multiple users must be able to have concurrent timers on the same project.
-- The one-timer-per-user constraint is correctly enforced by the UNIQUE on user_id.
DROP INDEX IF EXISTS "ongoing_timers_project_id_key";
