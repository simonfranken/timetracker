-- AlterTable
ALTER TABLE "client_targets" ALTER COLUMN "working_days" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ongoing_timers" ADD COLUMN     "break_minutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "break_start" TIMESTAMPTZ;
