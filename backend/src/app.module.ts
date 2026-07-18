import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { LibraryModule } from './modules/library/library.module';
import { DownloadsModule } from './modules/downloads/downloads.module';
import { QueueModule } from './modules/queue/queue.module';
import { MetadataModule } from './modules/metadata/metadata.module';
import { PlaylistsModule } from './modules/playlists/playlists.module';
import { SettingsModule } from './modules/settings/settings.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    LibraryModule,
    DownloadsModule,
    QueueModule,
    MetadataModule,
    PlaylistsModule,
    SettingsModule,
    IntegrationsModule,
    WebSocketModule,
    DashboardModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
