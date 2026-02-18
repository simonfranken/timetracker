-- CreateTable
CREATE TABLE "client_targets" (
    "id" TEXT NOT NULL,
    "weekly_hours" DOUBLE PRECISION NOT NULL,
    "start_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "client_id" TEXT NOT NULL,

    CONSTRAINT "client_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_corrections" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "client_target_id" TEXT NOT NULL,

    CONSTRAINT "balance_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_targets_user_id_idx" ON "client_targets"("user_id");

-- CreateIndex
CREATE INDEX "client_targets_client_id_idx" ON "client_targets"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_targets_user_id_client_id_key" ON "client_targets"("user_id", "client_id");

-- CreateIndex
CREATE INDEX "balance_corrections_client_target_id_idx" ON "balance_corrections"("client_target_id");

-- AddForeignKey
ALTER TABLE "client_targets" ADD CONSTRAINT "client_targets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_targets" ADD CONSTRAINT "client_targets_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_corrections" ADD CONSTRAINT "balance_corrections_client_target_id_fkey" FOREIGN KEY ("client_target_id") REFERENCES "client_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
