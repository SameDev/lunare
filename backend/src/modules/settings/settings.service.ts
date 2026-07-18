import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppSettings } from '@prisma/client';
import { SettingsRepository } from './settings.repository';
import { UpdateSettingsDto } from './dto/update-settings.dto';

const DEFAULT_ALLOWED_FORMATS = ['mp3', 'flac', 'opus', 'm4a', 'wav'];
const DEFAULT_QUALITY = '192K';

@Injectable()
export class SettingsService implements OnApplicationBootstrap {
  // In-process cache — fine for the single-instance deployment target (see design doc).
  private cache?: AppSettings;

  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const existing = await this.settingsRepository.find();
    if (existing) {
      this.cache = existing;
      return;
    }

    this.cache = await this.settingsRepository.create({
      libraryPath: this.config.getOrThrow<string>('LIBRARY_PATH'),
      downloadTmpPath: this.config.getOrThrow<string>('DOWNLOAD_TMP_PATH'),
      allowedFormats: DEFAULT_ALLOWED_FORMATS,
      defaultQuality: DEFAULT_QUALITY,
      language: 'pt-BR',
      theme: 'dark',
      maxConcurrentDownloads: 2,
    });
  }

  async get(): Promise<AppSettings> {
    if (!this.cache) {
      this.cache = (await this.settingsRepository.find()) ?? (await this.forceBootstrap());
    }
    return this.cache;
  }

  async update(dto: UpdateSettingsDto): Promise<AppSettings> {
    this.cache = await this.settingsRepository.update(dto);
    return this.cache;
  }

  async getLibraryPath(): Promise<string> {
    return (await this.get()).libraryPath;
  }

  async getDownloadTmpPath(): Promise<string> {
    return (await this.get()).downloadTmpPath;
  }

  private async forceBootstrap(): Promise<AppSettings> {
    await this.onApplicationBootstrap();
    return this.cache!;
  }
}
