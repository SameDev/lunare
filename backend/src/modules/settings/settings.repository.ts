import { Injectable } from '@nestjs/common';
import { AppSettings } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const SETTINGS_ID = 1;

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  find(): Promise<AppSettings | null> {
    return this.prisma.appSettings.findUnique({ where: { id: SETTINGS_ID } });
  }

  create(data: Omit<AppSettings, 'id' | 'updatedAt'>): Promise<AppSettings> {
    return this.prisma.appSettings.create({ data: { id: SETTINGS_ID, ...data } });
  }

  update(data: Partial<Omit<AppSettings, 'id' | 'updatedAt'>>): Promise<AppSettings> {
    return this.prisma.appSettings.update({ where: { id: SETTINGS_ID }, data });
  }
}
