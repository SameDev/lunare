import { Injectable } from '@nestjs/common';
import * as os from 'node:os';
import { LibraryService } from '../library/library.service';
import { DownloadsService } from '../downloads/downloads.service';
import { QueueService } from '../queue/queue.service';
import { SettingsService } from '../settings/settings.service';
import { getDirectorySizeBytes } from './lib/disk-usage.util';

@Injectable()
export class DashboardService {
  constructor(
    private readonly libraryService: LibraryService,
    private readonly downloadsService: DownloadsService,
    private readonly queueService: QueueService,
    private readonly settingsService: SettingsService,
  ) {}

  async getStats(userId: string) {
    const libraryPath = await this.settingsService.getLibraryPath();

    const [library, downloads, queue, libraryDiskUsageBytes] = await Promise.all([
      this.libraryService.getCounts(),
      this.downloadsService.getCounts(userId),
      this.queueService.getCounts(),
      getDirectorySizeBytes(libraryPath),
    ]);

    return {
      library,
      downloads,
      queue,
      libraryDiskUsageBytes,
      system: {
        cpuLoadAverage: os.loadavg(),
        memory: {
          totalBytes: os.totalmem(),
          freeBytes: os.freemem(),
          usedBytes: os.totalmem() - os.freemem(),
        },
      },
    };
  }
}
