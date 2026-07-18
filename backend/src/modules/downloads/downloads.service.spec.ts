import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DownloadStatus, DownloadJob } from '@prisma/client';
import { DownloadsService } from './downloads.service';
import { DownloadsRepository } from './downloads.repository';
import { YtDlpService } from '../queue/lib/ytdlp.service';
import { DOWNLOADS_QUEUE } from '../queue/queue.constants';

function makeJob(overrides: Partial<DownloadJob> = {}): DownloadJob {
  return {
    id: 'job-1',
    userId: 'user-1',
    batchId: 'batch-1',
    sourceUrl: 'http://example.com/a.mp3',
    sourceTitle: 'a',
    sourceArtist: null,
    playlistIndex: null,
    status: DownloadStatus.PENDING,
    progress: 0,
    format: 'mp3',
    quality: '192K',
    destinationFolder: null,
    customTitle: null,
    errorMessage: null,
    resultTrackId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('DownloadsService', () => {
  let service: DownloadsService;
  let repo: { createMany: jest.Mock; findById: jest.Mock; cancel: jest.Mock; findByUser: jest.Mock; getCounts: jest.Mock };
  let ytDlp: { probeEntries: jest.Mock };
  let queue: { add: jest.Mock; getJob: jest.Mock };

  beforeEach(async () => {
    repo = { createMany: jest.fn(), findById: jest.fn(), cancel: jest.fn(), findByUser: jest.fn(), getCounts: jest.fn() };
    ytDlp = { probeEntries: jest.fn() };
    queue = { add: jest.fn(), getJob: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DownloadsService,
        { provide: DownloadsRepository, useValue: repo },
        { provide: YtDlpService, useValue: ytDlp },
        { provide: getQueueToken(DOWNLOADS_QUEUE), useValue: queue },
      ],
    }).compile();

    service = module.get(DownloadsService);
  });

  describe('submit', () => {
    it('creates one job and enqueues it for a single-URL submission', async () => {
      ytDlp.probeEntries.mockResolvedValue([{ url: 'http://example.com/a.mp3', title: 'Song A' }]);
      repo.createMany.mockResolvedValue([makeJob()]);

      const jobs = await service.submit('user-1', {
        urls: ['http://example.com/a.mp3'],
        format: 'mp3' as never,
        quality: '192K' as never,
      });

      expect(jobs).toHaveLength(1);
      expect(queue.add).toHaveBeenCalledWith('download', { downloadJobId: 'job-1' }, { jobId: 'job-1' });
    });

    it('expands a playlist URL into one job per entry', async () => {
      ytDlp.probeEntries.mockResolvedValue([
        { url: 'http://example.com/1.mp3', title: 'Track 1', playlistIndex: 1 },
        { url: 'http://example.com/2.mp3', title: 'Track 2', playlistIndex: 2 },
      ]);
      repo.createMany.mockResolvedValue([makeJob({ id: 'job-1' }), makeJob({ id: 'job-2' })]);

      const jobs = await service.submit('user-1', {
        urls: ['http://example.com/playlist'],
        format: 'mp3' as never,
        quality: '192K' as never,
      });

      expect(jobs).toHaveLength(2);
      expect(queue.add).toHaveBeenCalledTimes(2);
      const createdInput = repo.createMany.mock.calls[0][0];
      expect(createdInput[0].playlistIndex).toBe(1);
      expect(createdInput[1].playlistIndex).toBe(2);
    });

    it('rejects customTitle when the request expands to more than one track', async () => {
      ytDlp.probeEntries.mockResolvedValue([
        { url: 'http://example.com/1.mp3' },
        { url: 'http://example.com/2.mp3' },
      ]);

      await expect(
        service.submit('user-1', {
          urls: ['http://example.com/playlist'],
          format: 'mp3' as never,
          quality: '192K' as never,
          customTitle: 'Ambiguous',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(repo.createMany).not.toHaveBeenCalled();
    });

    it('rejects when yt-dlp cannot resolve any of the URLs', async () => {
      ytDlp.probeEntries.mockRejectedValue(new Error('connection refused'));

      await expect(
        service.submit('user-1', { urls: ['http://bad'], format: 'mp3' as never, quality: '192K' as never }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when probing succeeds but yields zero entries', async () => {
      ytDlp.probeEntries.mockResolvedValue([]);

      await expect(
        service.submit('user-1', { urls: ['http://empty'], format: 'mp3' as never, quality: '192K' as never }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException for a missing job', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findOne('user-1', 'ghost')).rejects.toThrow(NotFoundException);
    });

    it("throws ForbiddenException for another user's job", async () => {
      repo.findById.mockResolvedValue(makeJob({ userId: 'someone-else' }));
      await expect(service.findOne('user-1', 'job-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancel', () => {
    it('cancels a pending job and removes it from the queue', async () => {
      repo.findById.mockResolvedValue(makeJob({ status: DownloadStatus.PENDING }));
      const remove = jest.fn();
      queue.getJob.mockResolvedValue({ remove });
      repo.cancel.mockResolvedValue(makeJob({ status: DownloadStatus.FAILED }));

      await service.cancel('user-1', 'job-1');

      expect(remove).toHaveBeenCalled();
      expect(repo.cancel).toHaveBeenCalledWith('job-1');
    });

    it('rejects cancelling a job that already started downloading', async () => {
      repo.findById.mockResolvedValue(makeJob({ status: DownloadStatus.DOWNLOADING }));

      await expect(service.cancel('user-1', 'job-1')).rejects.toThrow(BadRequestException);
      expect(repo.cancel).not.toHaveBeenCalled();
    });
  });
});
