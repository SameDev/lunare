import { Injectable } from '@nestjs/common';
import { Webhook } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhookEvent } from './webhook-events';

@Injectable()
export class IntegrationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, url: string, events: WebhookEvent[]): Promise<Webhook> {
    return this.prisma.webhook.create({ data: { userId, url, events } });
  }

  findByUser(userId: string): Promise<Webhook[]> {
    return this.prisma.webhook.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  findById(id: string): Promise<Webhook | null> {
    return this.prisma.webhook.findUnique({ where: { id } });
  }

  update(id: string, data: { url?: string; events?: WebhookEvent[]; enabled?: boolean }): Promise<Webhook> {
    return this.prisma.webhook.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.webhook.delete({ where: { id } });
  }

  findEnabledForEvent(userId: string, event: WebhookEvent): Promise<Webhook[]> {
    return this.prisma.webhook.findMany({
      where: { userId, enabled: true, events: { has: event } },
    });
  }
}
