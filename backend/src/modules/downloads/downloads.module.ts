import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { DownloadsController } from './downloads.controller';
import { DownloadsService } from './downloads.service';
import { DownloadsRepository } from './downloads.repository';

@Module({
  imports: [QueueModule],
  controllers: [DownloadsController],
  providers: [DownloadsService, DownloadsRepository],
  exports: [DownloadsService],
})
export class DownloadsModule {}
