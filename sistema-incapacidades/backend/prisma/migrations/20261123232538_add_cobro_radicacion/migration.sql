/*
  Warnings:

  - Added the required column `radicacion_id` to the `cobros` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "cobros" ADD COLUMN     "radicacion_id" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "cobros_radicacion_id_idx" ON "cobros"("radicacion_id");

-- AddForeignKey
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_radicacion_id_fkey" FOREIGN KEY ("radicacion_id") REFERENCES "radicaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
