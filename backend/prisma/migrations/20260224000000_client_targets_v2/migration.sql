-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('WEEKLY', 'MONTHLY');

-- AlterTable: rename weekly_hours -> target_hours, add period_type, add working_days
ALTER TABLE "client_targets"
  RENAME COLUMN "weekly_hours" TO "target_hours";

ALTER TABLE "client_targets"
  ADD COLUMN "period_type" "PeriodType" NOT NULL DEFAULT 'WEEKLY',
  ADD COLUMN "working_days" TEXT[] NOT NULL DEFAULT ARRAY['MON','TUE','WED','THU','FRI']::TEXT[];
