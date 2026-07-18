import { Injectable } from '@nestjs/common';
import { DownloadJob, DownloadStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class QueueRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<DownloadJob | null> {
    return this.prisma.downloadJob.findUnique({ where: { id } });
  }

  updateProgress(id: string, status: DownloadStatus, progress: number): Promise<DownloadJob> {
    return this.prisma.downloadJob.update({ where: { id }, data: { status, progress } });
  }

  markCompleted(id: string, resultTrackId: string): Promise<DownloadJob> {
    return this.prisma.downloadJob.update({
      where: { id },
      data: { status: DownloadStatus.COMPLETED, progress: 100, resultTrackId },
    });
  }

  markFailed(id: string, errorMessage: string): Promise<DownloadJob> {
    return this.prisma.downloadJob.update({
      where: { id },
      data: { status: DownloadStatus.FAILED, errorMessage },
    });
  }
}
