import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DownloadStatus } from '@prisma/client';
import { join, resolve, sep } from 'node:path';
import { mkdir, rm } from 'node:fs/promises';
import { MetadataService } from '../../metadata/metadata.service';
import { LibraryService } from '../../library/library.service';
import { WebSocketService } from '../../websocket/websocket.service';
import { SettingsService } from '../../settings/settings.service';
import { QueueRepository } from '../queue.repository';
import { YtDlpService } from '../lib/ytdlp.service';
import { moveFile, sanitizeFilenameSegment } from '../lib/filesystem.util';
import { DownloadJobData } from '../interfaces/download-job-data.interface';
import { DOWNLOADS_QUEUE } from '../queue.constants';

const UNKNOWN_ARTIST = 'Unknown Artist';
const UNKNOWN_ALBUM = 'Unknown Album';

@Processor(DOWNLOADS_QUEUE)
export class DownloadProcessor extends WorkerHost {
  private readonly logger = new Logger(DownloadProcessor.name);

  constructor(
    private readonly queueRepository: QueueRepository,
    private readonly ytDlpService: YtDlpService,
    private readonly metadataService: MetadataService,
    private readonly libraryService: LibraryService,
    private readonly websocketService: WebSocketService,
    private readonly settingsService: SettingsService,
  ) {
    super();
  }

  async process(job: Job<DownloadJobData>): Promise<void> {
    const downloadJob = await this.queueRepository.findById(job.data.downloadJobId);
    if (!downloadJob) {
      throw new Error(`DownloadJob ${job.data.downloadJobId} not found`);
    }

    const tempDir = join(await this.settingsService.getDownloadTmpPath(), downloadJob.id);

    try {
      await mkdir(tempDir, { recursive: true });

      await this.updateStatus(downloadJob.userId, downloadJob.id, DownloadStatus.DOWNLOADING, 0);

      let lastReportedPercent = -1;
      const { filePath: downloadedFilePath } = await this.ytDlpService.download(
        downloadJob.sourceUrl,
        { format: downloadJob.format, quality: downloadJob.quality, outputDir: tempDir },
        (percent) => {
          const rounded = Math.floor(percent);
          if (rounded !== lastReportedPercent) {
            lastReportedPercent = rounded;
            void this.updateStatus(downloadJob.userId, downloadJob.id, DownloadStatus.DOWNLOADING, rounded);
          }
        },
      );

      await this.updateStatus(downloadJob.userId, downloadJob.id, DownloadStatus.CONVERTING, 100);

      const title = downloadJob.customTitle ?? downloadJob.sourceTitle ?? 'Unknown Title';
      const artist = downloadJob.sourceArtist ?? UNKNOWN_ARTIST;
      const album = UNKNOWN_ALBUM;

      await this.updateStatus(downloadJob.userId, downloadJob.id, DownloadStatus.ORGANIZING, 100);

      const libraryPath = await this.settingsService.getLibraryPath();
      const safeArtist = sanitizeFilenameSegment(artist, UNKNOWN_ARTIST);
      const safeAlbum = sanitizeFilenameSegment(album, UNKNOWN_ALBUM);
      const safeTitle = sanitizeFilenameSegment(title, 'Unknown Title');
      const ext = downloadedFilePath.slice(downloadedFilePath.lastIndexOf('.'));
      const trackFileName = downloadJob.playlistIndex
        ? `${String(downloadJob.playlistIndex).padStart(2, '0')} - ${safeTitle}${ext}`
        : `${safeTitle}${ext}`;
      const destPath = resolve(
        join(libraryPath, downloadJob.destinationFolder ?? '', safeArtist, safeAlbum, trackFileName),
      );
      const libraryRoot = resolve(libraryPath);
      if (destPath !== libraryRoot && !destPath.startsWith(libraryRoot + sep)) {
        throw new Error('Resolved destination path escapes the configured library directory');
      }

      // Tag-write happens after the move: MetadataService only touches files inside
      // LIBRARY_PATH (path-traversal guard), and the download temp dir lives outside it.
      await moveFile(downloadedFilePath, destPath);

      await this.metadataService.writeTags({
        filePath: destPath,
        title,
        artist,
        album,
        trackNumber: downloadJob.playlistIndex ?? undefined,
      });

      const track = await this.libraryService.upsertTrackFromFile({
        artistName: artist,
        albumTitle: album,
        title,
        trackNumber: downloadJob.playlistIndex ?? undefined,
        filePath: destPath,
      });

      await this.queueRepository.markCompleted(downloadJob.id, track.id);
      this.websocketService.emitToUser(downloadJob.userId, 'download:completed', {
        id: downloadJob.id,
        trackId: track.id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Download job ${downloadJob.id} failed: ${message}`);
      await this.queueRepository.markFailed(downloadJob.id, message);
      this.websocketService.emitToUser(downloadJob.userId, 'download:failed', {
        id: downloadJob.id,
        error: message,
      });
      throw error;
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async updateStatus(
    userId: string,
    jobId: string,
    status: DownloadStatus,
    progress: number,
  ): Promise<void> {
    await this.queueRepository.updateProgress(jobId, status, progress);
    this.websocketService.emitToUser(userId, 'download:progress', { id: jobId, status, progress });
  }
}
