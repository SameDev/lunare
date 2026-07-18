import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsIn, IsUrl } from 'class-validator';
import { WEBHOOK_EVENTS, WebhookEvent } from '../webhook-events';

export class CreateWebhookDto {
  @ApiProperty()
  @IsUrl({ require_tld: false })
  url!: string;

  @ApiProperty({ enum: WEBHOOK_EVENTS, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(WEBHOOK_EVENTS, { each: true })
  events!: WebhookEvent[];
}
