-- CreateTable
CREATE TABLE "app_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "libraryPath" TEXT NOT NULL,
    "downloadTmpPath" TEXT NOT NULL,
    "allowedFormats" TEXT[],
    "defaultQuality" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "maxConcurrentDownloads" INTEGER NOT NULL DEFAULT 2,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);
