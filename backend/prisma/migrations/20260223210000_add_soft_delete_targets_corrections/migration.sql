-- AlterTable: add deleted_at column to client_targets
ALTER TABLE "client_targets" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- AlterTable: add deleted_at column to balance_corrections
ALTER TABLE "balance_corrections" ADD COLUMN "deleted_at" TIMESTAMP(3);
