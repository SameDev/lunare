export const WEBHOOK_EVENTS = ['download.completed', 'download.failed'] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
