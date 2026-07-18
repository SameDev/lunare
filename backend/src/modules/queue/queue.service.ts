import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DOWNLOADS_QUEUE } from './queue.constants';

@Injectable()
export class QueueService {
  constructor(@InjectQueue(DOWNLOADS_QUEUE) private readonly downloadsQueue: Queue) {}

  getCounts() {
    return this.downloadsQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
  }
}
