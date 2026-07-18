import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MetadataModule } from '../metadata/metadata.module';
import { LibraryModule } from '../library/library.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { SettingsModule } from '../settings/settings.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { QueueRepository } from './queue.repository';
import { YtDlpService } from './lib/ytdlp.service';
import { DownloadProcessor } from './processors/download.processor';
import { DOWNLOADS_QUEUE } from './queue.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.getOrThrow<string>('REDIS_HOST'),
          port: config.getOrThrow<number>('REDIS_PORT'),
        },
      }),
    }),
    BullModule.registerQueue({
      name: DOWNLOADS_QUEUE,
      defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    }),
    MetadataModule,
    LibraryModule,
    WebSocketModule,
    SettingsModule,
    IntegrationsModule,
  ],
  controllers: [QueueController],
  providers: [QueueService, QueueRepository, YtDlpService, DownloadProcessor],
  exports: [QueueService, BullModule, YtDlpService],
})
export class QueueModule {}
