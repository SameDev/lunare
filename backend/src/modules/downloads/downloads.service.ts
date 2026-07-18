import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DownloadJob, DownloadStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { DOWNLOADS_QUEUE } from '../queue/queue.constants';
import { DownloadJobData } from '../queue/interfaces/download-job-data.interface';
import { YtDlpService } from '../queue/lib/ytdlp.service';
import { DownloadsRepository } from './downloads.repository';
import { CreateDownloadDto } from './dto/create-download.dto';

@Injectable()
export class DownloadsService {
  constructor(
    private readonly downloadsRepository: DownloadsRepository,
    private readonly ytDlpService: YtDlpService,
    @InjectQueue(DOWNLOADS_QUEUE) private readonly downloadsQueue: Queue<DownloadJobData>,
  ) {}

  async submit(userId: string, dto: CreateDownloadDto): Promise<DownloadJob[]> {
    let entryLists: Awaited<ReturnType<YtDlpService['probeEntries']>>[];
    try {
      entryLists = await Promise.all(dto.urls.map((url) => this.ytDlpService.probeEntries(url)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Could not resolve the given URL(s): ${message}`);
    }
    const entries = entryLists.flat();

    if (entries.length === 0) {
      throw new BadRequestException('No downloadable entries found for the given URL(s)');
    }
    if (entries.length > 1 && dto.customTitle) {
      throw new BadRequestException('customTitle is only allowed when a single track results from this request');
    }

    const batchId = randomUUID();

    const jobs = await this.downloadsRepository.createMany(
      entries.map((entry) => ({
        userId,
        batchId,
        sourceUrl: entry.url,
        sourceTitle: entry.title,
        sourceArtist: entry.uploader,
        playlistIndex: entry.playlistIndex,
        format: dto.format,
        quality: dto.quality,
        destinationFolder: dto.destinationFolder,
        customTitle: entries.length === 1 ? dto.customTitle : undefined,
      })),
    );

    await Promise.all(
      jobs.map((job) =>
        this.downloadsQueue.add('download', { downloadJobId: job.id }, { jobId: job.id }),
      ),
    );

    return jobs;
  }

  list(userId: string, page: number, limit: number) {
    return this.downloadsRepository.findByUser(userId, page, limit);
  }

  async findOne(userId: string, id: string): Promise<DownloadJob> {
    const job = await this.downloadsRepository.findById(id);
    if (!job) {
      throw new NotFoundException('Download job not found');
    }
    if (job.userId !== userId) {
      throw new ForbiddenException();
    }
    return job;
  }

  async cancel(userId: string, id: string): Promise<DownloadJob> {
    const job = await this.findOne(userId, id);
    if (job.status !== DownloadStatus.PENDING) {
      throw new BadRequestException('Only pending jobs can be cancelled');
    }

    const queuedJob = await this.downloadsQueue.getJob(id);
    await queuedJob?.remove();

    return this.downloadsRepository.cancel(id);
  }
}
