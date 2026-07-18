import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Webhook } from '@prisma/client';
import { IntegrationsRepository } from './integrations.repository';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { WebhookEvent } from './webhook-events';

const WEBHOOK_TIMEOUT_MS = 5000;

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(private readonly integrationsRepository: IntegrationsRepository) {}

  create(userId: string, dto: CreateWebhookDto): Promise<Webhook> {
    return this.integrationsRepository.create(userId, dto.url, dto.events);
  }

  list(userId: string): Promise<Webhook[]> {
    return this.integrationsRepository.findByUser(userId);
  }

  async findOne(userId: string, id: string): Promise<Webhook> {
    const webhook = await this.integrationsRepository.findById(id);
    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }
    if (webhook.userId !== userId) {
      throw new ForbiddenException();
    }
    return webhook;
  }

  async update(userId: string, id: string, dto: UpdateWebhookDto): Promise<Webhook> {
    await this.findOne(userId, id);
    return this.integrationsRepository.update(id, dto);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);
    await this.integrationsRepository.delete(id);
  }

  async notify(userId: string, event: WebhookEvent, payload: Record<string, unknown>): Promise<void> {
    const webhooks = await this.integrationsRepository.findEnabledForEvent(userId, event);

    await Promise.all(
      webhooks.map(async (webhook) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
        try {
          await fetch(webhook.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event, ...payload }),
            signal: controller.signal,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`Webhook ${webhook.id} delivery failed: ${message}`);
        } finally {
          clearTimeout(timeout);
        }
      }),
    );
  }
}
