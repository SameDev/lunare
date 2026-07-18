import { Injectable } from '@nestjs/common';
import { DownloadJob, DownloadStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type CreateDownloadJobInput = Omit<
  Prisma.DownloadJobUncheckedCreateInput,
  'id' | 'status' | 'progress' | 'createdAt' | 'updatedAt'
>;

@Injectable()
export class DownloadsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createMany(inputs: CreateDownloadJobInput[]): Promise<DownloadJob[]> {
    return this.prisma.$transaction(inputs.map((data) => this.prisma.downloadJob.create({ data })));
  }

  async findByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: DownloadJob[]; total: number }> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.downloadJob.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.downloadJob.count({ where: { userId } }),
    ]);

    return { items, total };
  }

  findById(id: string): Promise<DownloadJob | null> {
    return this.prisma.downloadJob.findUnique({ where: { id } });
  }

  cancel(id: string): Promise<DownloadJob> {
    return this.prisma.downloadJob.update({
      where: { id },
      data: { status: DownloadStatus.FAILED, errorMessage: 'Cancelled by user' },
    });
  }
}
