import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { MetadataController } from './metadata.controller';
import { MetadataService } from './metadata.service';
import { MetadataRepository } from './metadata.repository';

@Module({
  imports: [SettingsModule],
  controllers: [MetadataController],
  providers: [MetadataService, MetadataRepository],
  exports: [MetadataService],
})
export class MetadataModule {}
