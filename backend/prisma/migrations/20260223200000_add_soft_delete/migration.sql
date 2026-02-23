-- AlterTable: add deleted_at column to clients
ALTER TABLE "clients" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- AlterTable: add deleted_at column to projects
ALTER TABLE "projects" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- AlterTable: add deleted_at column to time_entries
ALTER TABLE "time_entries" ADD COLUMN "deleted_at" TIMESTAMP(3);
