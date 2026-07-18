import { Module } from '@nestjs/common';
import { LibraryModule } from '../library/library.module';
import { DownloadsModule } from '../downloads/downloads.module';
import { QueueModule } from '../queue/queue.module';
import { SettingsModule } from '../settings/settings.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [LibraryModule, DownloadsModule, QueueModule, SettingsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
