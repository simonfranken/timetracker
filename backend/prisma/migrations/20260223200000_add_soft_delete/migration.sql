-- AlterTable: add deleted_at column to clients
ALTER TABLE "clients" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- AlterTable: add deleted_at column to projects
ALTER TABLE "projects" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- AlterTable: add deleted_at column to time_entries
ALTER TABLE "time_entries" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- DropForeignKey: remove cascade from projects -> clients
ALTER TABLE "projects" DROP CONSTRAINT "projects_client_id_fkey";

-- DropForeignKey: remove cascade from time_entries -> projects
ALTER TABLE "time_entries" DROP CONSTRAINT "time_entries_project_id_fkey";

-- AddForeignKey: re-add without onDelete cascade
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: re-add without onDelete cascade
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
