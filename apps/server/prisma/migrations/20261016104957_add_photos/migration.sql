/*
  Warnings:

  - You are about to drop the column `avatarUrl` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "UploadKind" AS ENUM ('WORKOUT_PHOTO', 'AVATAR');

-- AlterTable
-- Drop + add, not RENAME, on purpose: a stored URL is not a storage key, so
-- old values would be invalid. The column was never written to (no avatar upload existed).
ALTER TABLE "users" DROP COLUMN "avatarUrl",
ADD COLUMN     "avatarKey" TEXT;

-- CreateTable
CREATE TABLE "uploads" (
    "key" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "kind" "UploadKind" NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "workout_photos" (
    "id" UUID NOT NULL,
    "workoutId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "uploads_userId_idx" ON "uploads"("userId");

-- CreateIndex
CREATE INDEX "uploads_createdAt_idx" ON "uploads"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "workout_photos_key_key" ON "workout_photos"("key");

-- CreateIndex
CREATE UNIQUE INDEX "workout_photos_workoutId_position_key" ON "workout_photos"("workoutId", "position");

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_photos" ADD CONSTRAINT "workout_photos_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
