-- CreateEnum
CREATE TYPE "DownloadStatus" AS ENUM ('PENDING', 'DOWNLOADING', 'CONVERTING', 'ORGANIZING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "download_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "batchId" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "sourceTitle" TEXT,
    "sourceArtist" TEXT,
    "playlistIndex" INTEGER,
    "status" "DownloadStatus" NOT NULL DEFAULT 'PENDING',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "format" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "destinationFolder" TEXT,
    "customTitle" TEXT,
    "errorMessage" TEXT,
    "resultTrackId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "download_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "download_jobs_resultTrackId_key" ON "download_jobs"("resultTrackId");

-- CreateIndex
CREATE INDEX "download_jobs_userId_createdAt_idx" ON "download_jobs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "download_jobs_batchId_idx" ON "download_jobs"("batchId");

-- AddForeignKey
ALTER TABLE "download_jobs" ADD CONSTRAINT "download_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download_jobs" ADD CONSTRAINT "download_jobs_resultTrackId_fkey" FOREIGN KEY ("resultTrackId") REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
